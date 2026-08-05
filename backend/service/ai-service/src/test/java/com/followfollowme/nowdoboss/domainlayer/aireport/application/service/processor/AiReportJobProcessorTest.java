package com.followfollowme.nowdoboss.domainlayer.aireport.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AiReportJobSubscription;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.service.worker.AiReportWorker;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.nowdoboss.global.properties.AiReportJobProperties;
import java.time.Instant;
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
    private AiReportJobProcessor processor;

    @BeforeEach
    void setUp() {
        props = new AiReportJobProperties(86_400L, 2_592_000L, 30L, 300L);
        processor = new AiReportJobProcessor(jobStore, cache, jobEventPort, worker, props);
    }

    @Test
    void submitCommercialReport_cacheHit_returnsCachedAndSkipsJobLifecycle() {
        CommercialAiReportInfo info = mock(CommercialAiReportInfo.class);
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.of(info));

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.CACHED);
        assertThat(result.commercialReport()).isSameAs(info);
        assertThat(result.jobId()).isNull();
        verifyNoInteractions(jobStore, worker);
    }

    @Test
    void submitCommercialReport_cacheMissAndReservationWon_savesPendingThenReservesAndDispatches() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenReturn(Optional.empty());

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
        verify(worker).runJob(result.jobId());
    }

    @Test
    void submitCommercialReport_cacheMissAndReservationLost_deletesOrphanJobAndReturnsExistingId() {
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenReturn(Optional.of("existing"));

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
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenReturn(Optional.empty());
        doThrow(new RuntimeException("queue full")).when(worker).runJob(anyString());

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", "P");

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        // PENDING 저장 + FAILED 저장 = 2 회
        verify(jobStore, times(2)).save(any());
        verify(jobStore).save(argThat(job ->
            job.status() == AiReportJobStatus.FAILED
                && AiReportErrorCode.JOB_FAILED.getCode().equals(job.errorCode())
                && AiReportErrorCode.JOB_FAILED.getMessage().equals(job.errorMessage())
        ));
        verify(jobStore).releaseIdempotencyKey(eq(7L), anyString());
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

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.status()).isEqualTo(AiReportJobStatus.FAILED);
        assertThat(info.errorCode()).isEqualTo(AiReportErrorCode.JOB_TIMEOUT.getCode());
        assertThat(info.errorMessage()).isEqualTo(AiReportErrorCode.JOB_TIMEOUT.getMessage());
        verify(jobStore).save(argThat(job -> job.status() == AiReportJobStatus.FAILED));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
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

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.status()).isEqualTo(AiReportJobStatus.FAILED);
        assertThat(info.errorCode()).isEqualTo(AiReportErrorCode.JOB_TIMEOUT.getCode());
        verify(jobStore).save(argThat(job -> job.status() == AiReportJobStatus.FAILED));
        verify(jobStore).releaseIdempotencyKey(7L, "H");
    }

    @Test
    void getJobInfo_completedWithEmbeddedReport_returnsItWithoutCacheLookup() {
        CommercialAiReportInfo embedded = mock(CommercialAiReportInfo.class);
        AiReportJob done = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.now()).completedAt(Instant.now())
            .commercialReport(embedded)
            .build();
        when(jobStore.findById("J1")).thenReturn(Optional.of(done));

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.status()).isEqualTo(AiReportJobStatus.COMPLETED);
        assertThat(info.commercialReport()).isSameAs(embedded);
        // 결과는 job 스냅샷에서 직접 — 캐시 만료/무효화에 영향 받지 않음
        verifyNoInteractions(cache);
        verify(jobStore, never()).save(any());
        verify(jobStore, never()).releaseIdempotencyKey(any(), any());
    }

    @Test
    void getJobInfo_completedWithoutEmbeddedReport_fallsBackToCache() {
        AiReportJob done = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(commercialParams())
            .status(AiReportJobStatus.COMPLETED)
            .createdAt(Instant.now()).completedAt(Instant.now())
            .build();
        CommercialAiReportInfo cached = mock(CommercialAiReportInfo.class);
        when(jobStore.findById("J1")).thenReturn(Optional.of(done));
        when(cache.getCommercialReport("C", "S", "P")).thenReturn(Optional.of(cached));

        AiReportJobInfo info = processor.getJobInfo("J1", 7L);

        assertThat(info.commercialReport()).isSameAs(cached);
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
