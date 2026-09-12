package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.worker.AiReportWorker;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiReportJobProcessorTest {

    @Mock
    private AiReportJobStorePort jobStore;

    @Mock
    private AiReportCachePort cache;

    @Mock
    private AiReportJobEventPort jobEventPort;

    @Mock
    private AiReportWorker worker;

    private AiReportJobProperties props;
    private StubAiUsageCounterPort usageCounter;
    private AiReportJobProcessor processor;

    @BeforeEach
    void setUp() {
        props = new AiReportJobProperties(86_400L, 2_592_000L, 30L, 300L);
        usageCounter = new StubAiUsageCounterPort();
        processor = new AiReportJobProcessor(jobStore, cache, jobEventPort, worker, usageCounter, props);
    }

    /**
     * 사용량 카운터 스텁. 상한 미달/초과와 Redis 장애(fail-open)를 한 곳에서 흉내낸다.
     * 실제 어댑터의 Redis 예외 처리는 {@code RedisAiUsageCounterAdapterTest} 가 검증한다.
     */
    private static final class StubAiUsageCounterPort implements AiUsageCounterPort {

        private boolean withinQuota = true;
        private int consumeCallCount;

        @Override
        public void record(Long memberId, AiUsageMeta usage) {
        }

        @Override
        public boolean tryConsumeDailyQuota(long memberId) {
            consumeCallCount++;
            return withinQuota;
        }
    }

    @Test
    void getJobInfo_timeoutRaceLost_returnsLatestStatus() {
        AiReportJob stale = pendingJob(7L, Instant.now().minusSeconds(60));
        AiReportJob running = stale.withStatus(AiReportJobStatus.RUNNING, Instant.now());
        when(jobStore.findById("J1")).thenReturn(Optional.of(stale), Optional.of(running));

        assertThat(processor.getJobInfo("J1", 7L).status()).isEqualTo(AiReportJobStatus.RUNNING);

        verify(jobStore, never()).releaseIdempotencyKey(any(), any(), any());
        verifyNoInteractions(jobEventPort);
    }

    @Test
    void getJobInfo_expiredDuringTimeoutCas_returnsNotFound() {
        when(jobStore.findById("J1"))
            .thenReturn(Optional.of(pendingJob(7L, Instant.now().minusSeconds(60))), Optional.empty());

        assertThatThrownBy(() -> processor.getJobInfo("J1", 7L))
            .isInstanceOfSatisfying(AiReportException.class,
                exception -> assertThat(exception.getErrorCode()).isEqualTo(AiReportErrorCode.JOB_NOT_FOUND));

        verifyNoInteractions(jobEventPort);
    }

    @Test
    void submitCommercialReport_cacheHit_returnsCachedAndSkipsJobLifecycle() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.of(commercialSnapshot("캐시 요약")));

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.CACHED);
        // 캐시는 도메인 스냅샷을 돌려주고 Processor 가 Info 로 변환한다. 동일성이 아니라 내용으로 검증한다.
        assertCommercialInfo(result.commercialReport(), "캐시 요약");
        assertThat(result.jobId()).isNull();
        verifyNoInteractions(jobStore, worker);
        // 캐시 hit 은 LLM 을 호출하지 않으므로 사용량 슬롯을 소비하지 않는다.
        assertThat(usageCounter.consumeCallCount).isZero();
    }

    @Test
    void submitCommercialReport_withinDailyLimit_consumesQuotaAndProceeds() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(2));

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        assertThat(usageCounter.consumeCallCount).isEqualTo(1);
        verify(worker).runJob(eq(result.jobId()), eq(7L), anyString());
    }

    @Test
    void submitCommercialReport_dailyLimitExceeded_throwsUsageLimitExceededAndSkipsJobCreation() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        usageCounter.withinQuota = false;

        assertThatThrownBy(() -> processor.submitCommercialReport(7L, "C", "S", "P"))
            .isInstanceOf(AiReportException.class)
            .extracting(t -> ((AiReportException) t).getErrorCode())
            .isEqualTo(AiReportErrorCode.USAGE_LIMIT_EXCEEDED);
        // 429 로 거절되면 잡 entry / 멱등성 키 / 워커 디스패치가 전부 발생하지 않는다.
        verifyNoInteractions(jobStore, worker);
    }

    @Test
    void submitUsageLimitExceeded_appliesToAllFourSubmissionFlows() {
        usageCounter.withinQuota = false;
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(cache.getCommercialComparisonReport("L", "R", "S", "P")).thenReturn(Optional.empty());
        when(cache.getDistrictReport("D", "P")).thenReturn(Optional.empty());
        when(cache.getAdministrationReport("A", "P")).thenReturn(Optional.empty());

        assertUsageLimitRejected(() -> processor.submitCommercialReport(7L, "C", "S", "P"));
        assertUsageLimitRejected(() -> processor.submitCommercialComparisonReport(
            7L, new CommercialComparisonAiQuery("L", "R", "S", "P")
        ));
        assertUsageLimitRejected(() -> processor.submitDistrictReport(7L, "D", "P"));
        assertUsageLimitRejected(() -> processor.submitAdministrationReport(7L, "A", "P"));

        verifyNoInteractions(jobStore, worker);
    }

    @Test
    void submitCommercialReport_counterUnavailable_failsOpenAndProceeds() {
        // 카운터 저장소(Redis) 장애 시 어댑터가 true 를 돌려주므로(fail-open) 제출은 정상 진행된다.
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(2));
        usageCounter.withinQuota = true;

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        verify(worker).runJob(eq(result.jobId()), eq(7L), anyString());
    }

    private void assertUsageLimitRejected(org.assertj.core.api.ThrowableAssert.ThrowingCallable callable) {
        assertThatThrownBy(callable)
            .isInstanceOf(AiReportException.class)
            .extracting(t -> ((AiReportException) t).getErrorCode())
            .isEqualTo(AiReportErrorCode.USAGE_LIMIT_EXCEEDED);
    }

    @Test
    void submitCommercialReport_cacheMissAndReservationWon_savesPendingThenReservesAndDispatches() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(2));

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        assertThat(result.jobId()).isNotBlank();
        // PENDING 저장이 reserve 보다 먼저 일어나 idempotency 키가 항상 valid jobId 를 가리키도록 보장
        verify(jobStore).save(argThat(job ->
            job.status() == AiReportJobStatus.PENDING
                && job.memberId() == 7L
                && job.jobType() == AiReportJobType.COMMERCIAL
                && job.jobId().equals(result.jobId())
                && job.requestParams().get("commercialCode").equals("C")
        ));
        verify(jobStore).reserveOrGetExistingJobId(eq(7L), anyString(), eq(result.jobId()));
        verify(jobStore, never()).deleteJob(anyString());
        verify(worker).runJob(eq(result.jobId()), eq(7L), anyString());
    }

    @Test
    void submitCommercialReport_cacheMissAndReservationLost_deletesOrphanJobAndReturnsExistingId() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenReturn("existing");

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        assertThat(result.jobId()).isEqualTo("existing");
        // race 패배 시 우리 PENDING 작업은 즉시 삭제되어 orphan 잔여물 없음
        verify(jobStore).save(argThat(job -> job.status() == AiReportJobStatus.PENDING));
        verify(jobStore).deleteJob(argThat(id -> !id.equals("existing")));
        verifyNoInteractions(worker);
    }

    @Test
    void submitCommercialReport_workerDispatchFails_marksJobFailedAndReleasesIdempotency() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(2));
        when(jobStore.saveIfStatus(argThat(job -> job.status() == AiReportJobStatus.FAILED), eq(AiReportJobStatus.PENDING)))
            .thenReturn(true);
        doThrow(new RuntimeException("queue full")).when(worker).runJob(anyString(), any(), anyString());

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        verify(jobStore).save(any());
        verify(jobStore).saveIfStatus(argThat(job ->
            job.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.JOB_FAILED.getCode().equals(job.errorCode())
                && AiReportErrorCode.JOB_FAILED.getMessage().equals(job.errorMessage())
        ), eq(AiReportJobStatus.PENDING));
        verify(jobStore).releaseIdempotencyKey(eq(7L), anyString(), eq(result.jobId()));
    }

    @Test
    void submitCommercialReport_queueRejected_retainsAcceptedContractWithQueueFullJobError() {
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString()))
            .thenAnswer(invocation -> invocation.getArgument(2));
        when(jobStore.saveIfStatus(any(), eq(AiReportJobStatus.PENDING))).thenReturn(true);
        doThrow(new java.util.concurrent.RejectedExecutionException("queue full")).when(worker).runJob(anyString(), any(), anyString());

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        verify(jobStore).saveIfStatus(argThat(job ->
            job.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.JOB_QUEUE_FULL.getCode().equals(job.errorCode())), eq(AiReportJobStatus.PENDING));
        verify(jobStore).releaseIdempotencyKey(eq(7L), anyString(), eq(result.jobId()));
        verify(jobEventPort).publishJobUpdated(result.jobId());
    }

    @Test
    void submitCommercialReport_dispatchFailureRaceLost_doesNotReleaseOrPublish() {
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString()))
            .thenAnswer(invocation -> invocation.getArgument(2));
        doThrow(new RuntimeException("dispatch failed")).when(worker).runJob(anyString(), any(), anyString());

        assertThat(processor.submitCommercialReport(7L, "C", "S", "P").submissionStatus())
            .isEqualTo(AiReportSubmissionStatus.ACCEPTED);

        verify(jobStore, never()).releaseIdempotencyKey(any(), any(), any());
        verifyNoInteractions(jobEventPort);
    }

    @Test
    void getJobInfo_jobMissing_throwsJobNotFound() {
        when(jobStore.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> processor.getJobInfo("missing", 7L))
            .isInstanceOf(AiReportException.class)
            .extracting(t -> ((AiReportException) t).getErrorCode())
            .isEqualTo(AiReportErrorCode.JOB_NOT_FOUND);
    }

    @Test
    void getJobInfo_otherUserOwnsJob_throwsJobNotFound() {
        when(jobStore.findById("J1")).thenReturn(Optional.of(pendingJob(99L, Instant.now())));

        assertThatThrownBy(() -> processor.getJobInfo("J1", 7L))
            .isInstanceOf(AiReportException.class)
            .extracting(t -> ((AiReportException) t).getErrorCode())
            .isEqualTo(AiReportErrorCode.JOB_NOT_FOUND);
    }

    @Test
    void getJobInfo_pendingPastTimeout_marksFailedAndReleasesIdempotency() {
        Instant stale = Instant.now().minusSeconds(props.pendingTimeoutSeconds() + 5);
        when(jobStore.findById("J1")).thenReturn(Optional.of(pendingJob(7L, stale)));
        when(jobStore.saveIfStatus(argThat(job -> job.status() == AiReportJobStatus.FAILED), eq(AiReportJobStatus.PENDING)))
            .thenReturn(true);

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.status()).isEqualTo(AiReportJobStatus.FAILED);
        assertThat(info.errorCode()).isEqualTo(AiReportErrorCode.JOB_TIMEOUT.getCode());
        assertThat(info.errorMessage()).isEqualTo(AiReportErrorCode.JOB_TIMEOUT.getMessage());
        verify(jobStore).saveIfStatus(argThat(job -> job.status() == AiReportJobStatus.FAILED), eq(AiReportJobStatus.PENDING));
        verify(jobStore).releaseIdempotencyKey(7L, "H", "J1");
        // 타임아웃 전이도 상태 변경이므로 SSE 구독자에게 브로드캐스트되어야 한다.
        verify(jobEventPort).publishJobUpdated("J1");
    }

    @Test
    void subscribeJobUpdates_onEvent_reloadsLatestJobAndForwards() {
        when(jobStore.findById("J1")).thenReturn(Optional.of(pendingJob(7L, Instant.now())));
        AtomicReference<Runnable> registeredCallback = new AtomicReference<>();
        when(jobEventPort.subscribe(eq("J1"), any())).thenAnswer(invocation -> {
            registeredCallback.set(invocation.getArgument(1));
            return (AiReportJobSubscription) () -> {
            };
        });
        List<AiReportJobInfo> received = new ArrayList<>();

        processor.subscribeJobUpdates("J1", 7L, received::add);
        registeredCallback.get().run();

        assertThat(received).hasSize(1);
        assertThat(received.get(0).jobId()).isEqualTo("J1");
        assertThat(received.get(0).status()).isEqualTo(AiReportJobStatus.PENDING);
    }

    @Test
    void subscribeJobUpdates_reloadFailure_doesNotPropagateFromListenerThread() {
        when(jobStore.findById("J1")).thenReturn(Optional.empty());
        AtomicReference<Runnable> registeredCallback = new AtomicReference<>();
        when(jobEventPort.subscribe(eq("J1"), any())).thenAnswer(invocation -> {
            registeredCallback.set(invocation.getArgument(1));
            return (AiReportJobSubscription) () -> {
            };
        });
        List<AiReportJobInfo> received = new ArrayList<>();

        processor.subscribeJobUpdates("J1", 7L, received::add);
        registeredCallback.get().run();

        // 잡 소실(JOB_NOT_FOUND)은 pub/sub 리스너 스레드로 예외를 전파하지 않고 조용히 무시된다.
        assertThat(received).isEmpty();
    }

    @Test
    void getJobInfo_runningPastTimeout_marksFailedAndReleasesIdempotency() {
        Instant created = Instant.now().minusSeconds(props.runningTimeoutSeconds() + 30);
        Instant started = Instant.now().minusSeconds(props.runningTimeoutSeconds() + 5);
        AiReportJob running = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.RUNNING)
            .createdAt(created).startedAt(started)
            .build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(running));
        when(jobStore.saveIfStatus(argThat(job -> job.status() == AiReportJobStatus.FAILED), eq(AiReportJobStatus.RUNNING)))
            .thenReturn(true);

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.status()).isEqualTo(AiReportJobStatus.FAILED);
        assertThat(info.errorCode()).isEqualTo(AiReportErrorCode.JOB_TIMEOUT.getCode());
        verify(jobStore).saveIfStatus(argThat(job -> job.status() == AiReportJobStatus.FAILED), eq(AiReportJobStatus.RUNNING));
        verify(jobStore).releaseIdempotencyKey(7L, "H", "J1");
    }

    @Test
    void getJobInfo_completedWithEmbeddedReport_returnsItWithoutCacheLookup() {
        AiReportJob done = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.now()).completedAt(Instant.now())
            .commercialReport(commercialSnapshot("잡 스냅샷 요약"))
            .build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(done));

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.status()).isEqualTo(AiReportJobStatus.COMPLETED);
        // 잡 스냅샷 분기도 Info 로 변환되어야 한다. 변환을 빠뜨리면 본문 없는 COMPLETED 가 나간다.
        assertCommercialInfo(info.commercialReport(), "잡 스냅샷 요약");
        // 결과는 job 스냅샷에서 직접 — 캐시 만료/무효화에 영향 받지 않음
        verifyNoInteractions(cache);
        verify(jobStore, never()).save(any());
        verify(jobStore).releaseIdempotencyKey(7L, "H", "J1");
    }

    @Test
    void getJobInfo_completedWithoutEmbeddedReport_fallsBackToCache() {
        AiReportJob done = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.now()).completedAt(Instant.now())
            .build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(done));
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.of(commercialSnapshot("캐시 폴백 요약")));

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        // 캐시 폴백 분기도 반드시 변환을 타야 한다. 이 분기만 빠뜨리면 스냅샷이 없는 legacy 완료 잡에서
        // report 가 전부 null 인 COMPLETED 가 나가고, SSE 는 그것을 종결로 보고 본문 없이 스트림을 닫는다.
        assertCommercialInfo(info.commercialReport(), "캐시 폴백 요약");
    }

    @Test
    void getJobInfo_completedDistrictFallsBackToCache_convertsSnapshotToInfo() {
        AiReportJob done = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.DISTRICT).requestHash("H")
            .requestParams(Map.of("districtCode", "D", "periodCode", "P"))
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.now()).completedAt(Instant.now())
            .build();
        DistrictAiReportSnapshot snapshot = new DistrictAiReportSnapshot(
            "자치구 요약", "성장", List.of("커피전문점"), List.of("노래방"), "인사이트",
            LocalDateTime.of(2026, 8, 4, 13, 39, 45)
        );
        when(jobStore.findById("J1")).thenReturn(Optional.of(done));
        when(cache.getDistrictReport("D", "P")).thenReturn(Optional.of(snapshot));

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        DistrictAiReportInfo report = info.districtReport();
        assertThat(report).isNotNull();
        assertThat(report.summary()).isEqualTo("자치구 요약");
        assertThat(report.marketStatus()).isEqualTo("성장");
        assertThat(report.recommendedBusinessCategories()).containsExactly("커피전문점");
        assertThat(report.cautionBusinessCategories()).containsExactly("노래방");
        assertThat(report.businessInsight()).isEqualTo("인사이트");
        assertThat(report.generatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 4, 13, 39, 45));
    }

    @Test
    void getJobInfo_completedWithoutSnapshotAndCacheMiss_keepsReportNull() {
        AiReportJob done = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.now()).completedAt(Instant.now())
            .build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(done));
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        // 변환기는 null 을 그대로 통과시켜야 한다(NPE 로 조회 자체가 깨지면 안 된다).
        assertThat(info.status()).isEqualTo(AiReportJobStatus.COMPLETED);
        assertThat(info.commercialReport()).isNull();
    }

    private CommercialAiReportSnapshot commercialSnapshot(String summary) {
        return new CommercialAiReportSnapshot(
            summary, List.of("강점"), List.of("리스크"), List.of("추천업종"), List.of("고객층"),
            List.of("운영시간"), List.of("회피시간"), List.of("연령대"), List.of("성별"), List.of("팁"),
            "인사이트", LocalDateTime.of(2026, 8, 4, 13, 39, 45)
        );
    }

    private void assertCommercialInfo(CommercialAiReportInfo report, String expectedSummary) {
        assertThat(report).isNotNull();
        assertThat(report.summary()).isEqualTo(expectedSummary);
        assertThat(report.strengths()).containsExactly("강점");
        assertThat(report.risks()).containsExactly("리스크");
        assertThat(report.recommendedBusinessCategories()).containsExactly("추천업종");
        assertThat(report.recommendedCustomerSegments()).containsExactly("고객층");
        assertThat(report.recommendedOperatingHours()).containsExactly("운영시간");
        assertThat(report.avoidOperatingHours()).containsExactly("회피시간");
        assertThat(report.targetAgeGroups()).containsExactly("연령대");
        assertThat(report.targetGenders()).containsExactly("성별");
        assertThat(report.operationTips()).containsExactly("팁");
        assertThat(report.businessInsight()).isEqualTo("인사이트");
        assertThat(report.generatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 4, 13, 39, 45));
    }

    private AiReportJob pendingJob(long memberId, Instant createdAt) {
        return AiReportJob.builder()
            .jobId("J1").memberId(memberId).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.PENDING)
            .createdAt(createdAt)
            .build();
    }

    private Map<String, String> commercialParams() {
        return Map.of("commercialCode", "C", "serviceCode", "S", "periodCode", "P");
    }
}
