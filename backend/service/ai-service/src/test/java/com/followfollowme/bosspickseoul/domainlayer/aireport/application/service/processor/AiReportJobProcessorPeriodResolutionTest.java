package com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobEventPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AnalysisPeriodQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.worker.AiReportWorker;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobParamKeys;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 분기를 생략한 제출이 적재 기준 기본 분기로 해석된 뒤 캐시 키·멱등 해시·작업 파라미터를 만드는지 확인한다(이슈 #464).
 *
 * <p>해석 전 값(null)으로 키를 만들면 같은 리포트가 "생략"과 "명시"로 갈려 캐시를 두 번 채우고 LLM 을 두 번 부른다.
 * 워커는 저장된 파라미터로 원천을 다시 조회하므로, 파라미터에 해석된 분기가 들어가야 제출과 생성이 같은 분기를 본다.
 */
@ExtendWith(MockitoExtension.class)
class AiReportJobProcessorPeriodResolutionTest {

    private static final String DEFAULT_PERIOD = "20261";

    @Mock
    private AiReportJobStorePort jobStore;

    @Mock
    private AiReportCachePort cache;

    @Mock
    private AiReportJobEventPort jobEventPort;

    @Mock
    private AiReportWorker worker;

    private final CountingUsageCounter usageCounter = new CountingUsageCounter();
    private final StubPeriodPort periodPort = new StubPeriodPort();
    private AiReportJobProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new AiReportJobProcessor(jobStore, cache, jobEventPort, worker, usageCounter,
            new AiReportJobProperties(86_400L, 2_592_000L, 30L, 300L), periodPort);
    }

    @Test
    @DisplayName("분기를 생략하면 기본 분기로 캐시를 찾고 작업 파라미터와 제출 응답에 그 분기를 싣는다")
    void omittedPeriodIsResolvedBeforeCacheAndParams() {
        when(cache.getCommercialReport("C", "S", DEFAULT_PERIOD)).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(2));

        AiReportSubmissionInfo result = processor.submitCommercialReport(7L, "C", "S", null);

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.ACCEPTED);
        assertThat(result.periodCode()).isEqualTo(DEFAULT_PERIOD);
        ArgumentCaptor<AiReportJob> saved = ArgumentCaptor.forClass(AiReportJob.class);
        verify(jobStore).save(saved.capture());
        assertThat(saved.getValue().requestParams()).containsEntry(AiReportJobParamKeys.PERIOD_CODE, DEFAULT_PERIOD);
        assertThat(periodPort.calls).isEqualTo(1);
    }

    @Test
    @DisplayName("생략한 제출과 기본 분기를 명시한 제출은 같은 멱등 해시를 만든다")
    void omittedAndExplicitDefaultShareTheIdempotencyHash() {
        when(cache.getDistrictReport("D", DEFAULT_PERIOD)).thenReturn(Optional.empty());
        List<String> hashes = new ArrayList<>();
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> {
            hashes.add(invocation.getArgument(1));
            return invocation.getArgument(2);
        });

        processor.submitDistrictReport(7L, "D", "  ");
        processor.submitDistrictReport(7L, "D", DEFAULT_PERIOD);

        assertThat(hashes).hasSize(2);
        assertThat(hashes.get(0)).isEqualTo(hashes.get(1));
        assertThat(periodPort.calls).as("명시한 분기는 해석하지 않는다").isEqualTo(1);
    }

    @Test
    @DisplayName("캐시 hit 도 해석된 분기를 제출 응답에 싣는다")
    void cachedSubmissionCarriesTheResolvedPeriod() {
        when(cache.getDistrictReport("D", DEFAULT_PERIOD)).thenReturn(Optional.of(new DistrictAiReportSnapshot(
            "요약", "시장 현황", List.of(), List.of(), "인사이트", null)));

        AiReportSubmissionInfo result = processor.submitDistrictReport(7L, "D", null);

        assertThat(result.submissionStatus()).isEqualTo(AiReportSubmissionStatus.CACHED);
        assertThat(result.periodCode()).isEqualTo(DEFAULT_PERIOD);
        assertThat(usageCounter.calls).isZero();
    }

    @Test
    @DisplayName("비교 리포트도 분기를 해석해 바꿔 끼운 조건으로 캐시와 파라미터를 만든다")
    void comparisonQueryIsResolved() {
        when(cache.getCommercialComparisonReport("L", "R", "S", DEFAULT_PERIOD)).thenReturn(Optional.empty());
        when(jobStore.reserveOrGetExistingJobId(eq(7L), anyString(), anyString())).thenAnswer(invocation -> invocation.getArgument(2));

        AiReportSubmissionInfo result = processor.submitCommercialComparisonReport(7L, new CommercialComparisonAiQuery("L", "R", "S", null));

        assertThat(result.periodCode()).isEqualTo(DEFAULT_PERIOD);
        ArgumentCaptor<AiReportJob> saved = ArgumentCaptor.forClass(AiReportJob.class);
        verify(jobStore).save(saved.capture());
        assertThat(saved.getValue().requestParams()).containsEntry(AiReportJobParamKeys.PERIOD_CODE, DEFAULT_PERIOD);
    }

    @Test
    @DisplayName("기본 분기를 받지 못하면 503 이고 캐시 조회·사용량 차감·작업 생성이 일어나지 않는다")
    void unavailableDefaultFailsBeforeQuotaAndJobCreation() {
        periodPort.failure = new AiReportException(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE);

        assertThatThrownBy(() -> processor.submitAdministrationReport(7L, "A", null))
            .isInstanceOf(AiReportException.class)
            .extracting(exception -> ((AiReportException) exception).getErrorCode())
            .isEqualTo(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE);

        assertThat(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE.getHttpStatus().value()).isEqualTo(503);
        assertThat(usageCounter.calls).isZero();
        verifyNoInteractions(cache, jobStore, worker);
    }

    private static final class StubPeriodPort implements AnalysisPeriodQueryPort {

        private int calls;
        private AiReportException failure;

        @Override
        public String defaultPeriodCode() {
            calls++;
            if (failure != null) {
                throw failure;
            }
            return DEFAULT_PERIOD;
        }
    }

    private static final class CountingUsageCounter implements AiUsageCounterPort {

        private int calls;

        @Override
        public void record(Long memberId, AiUsageMeta usage) {
        }

        @Override
        public boolean tryConsumeDailyQuota(long memberId) {
            calls++;
            return true;
        }
    }
}
