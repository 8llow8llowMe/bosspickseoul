package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.CommercialAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.AnalysisPeriodsClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.global.properties.AiAnalysisPeriodProperties;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 기본 분기 메모가 TTL 동안 원격 호출을 아끼고, commercial-service 장애 중에는 마지막 성공값을 내는지 확인한다(이슈 #464).
 */
@ExtendWith(MockitoExtension.class)
class AnalysisPeriodClientAdapterTest {

    private static final Duration TTL = Duration.ofMinutes(5);

    @Mock
    private CommercialAnalysisClient commercialAnalysisClient;

    private final CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();
    private MutableClock clock;
    private AnalysisPeriodClientAdapter adapter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-01T00:00:00Z"));
        adapter = new AnalysisPeriodClientAdapter(commercialAnalysisClient, new InternalResponseSupport(registry),
            new AiAnalysisPeriodProperties(TTL), clock);
    }

    @Test
    @DisplayName("TTL 안에서는 다시 묻지 않고 TTL 이 지나면 새 기본 분기를 받는다")
    void memoizesWithinTheTtl() {
        when(commercialAnalysisClient.getAnalysisPeriods()).thenReturn(periods("20261"), periods("20262"));

        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(TTL.minusSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(Duration.ofSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20262");

        verify(commercialAnalysisClient, times(2)).getAnalysisPeriods();
    }

    @Test
    @DisplayName("갱신이 실패하면 마지막 성공값을 내고 다음 시도는 TTL 뒤로 미룬다")
    void servesStaleWhenRefreshFails() {
        when(commercialAnalysisClient.getAnalysisPeriods()).thenReturn(periods("20261")).thenThrow(feignError(503)).thenReturn(periods("20262"));

        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(TTL);
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(TTL.minusSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        verify(commercialAnalysisClient, times(2)).getAnalysisPeriods();

        clock.advance(Duration.ofSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20262");
    }

    @Test
    @DisplayName("한 번도 받지 못했으면 AI_013(503)")
    void coldFailureIsUnavailable() {
        when(commercialAnalysisClient.getAnalysisPeriods()).thenThrow(feignError(503));

        assertThatThrownBy(() -> adapter.defaultPeriodCode())
            .isInstanceOf(AiReportException.class)
            .extracting(exception -> ((AiReportException) exception).getErrorCode())
            .isEqualTo(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
    }

    @Test
    @DisplayName("commercial-service 가 기본 분기를 정하지 못했으면(null) 장애와 같게 AI_013")
    void nullDefaultIsUnavailable() {
        when(commercialAnalysisClient.getAnalysisPeriods()).thenReturn(periods(null));

        assertThatThrownBy(() -> adapter.defaultPeriodCode())
            .isInstanceOf(AiReportException.class)
            .extracting(exception -> ((AiReportException) exception).getErrorCode())
            .isEqualTo(AiReportErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
    }

    @Test
    @DisplayName("동시 제출에서 늦게 끝난 실패는 먼저 받은 성공 메모를 덮지 않고 그 값을 돌려준다")
    void lateFailureDoesNotOverwriteAConcurrentSuccess() throws Exception {
        CountDownLatch failureEntered = new CountDownLatch(1);
        CountDownLatch releaseFailure = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        when(commercialAnalysisClient.getAnalysisPeriods()).thenAnswer(invocation -> {
            if (calls.incrementAndGet() == 1) {
                failureEntered.countDown();
                releaseFailure.await(5, TimeUnit.SECONDS);
                throw feignError(503);
            }
            return periods("20261");
        });

        CompletableFuture<String> slowFailure = CompletableFuture.supplyAsync(adapter::defaultPeriodCode);
        assertThat(failureEntered.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        releaseFailure.countDown();

        assertThat(slowFailure.get(5, TimeUnit.SECONDS)).as("503 대신 동시에 받은 값을 돌려준다").isEqualTo("20261");
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        verify(commercialAnalysisClient, times(2)).getAnalysisPeriods();
    }

    @Test
    @DisplayName("/periods 실패는 기본 분기 전용 서킷에만 집계되고 원천 조회 서킷은 건드리지 않는다")
    void periodFailuresUseTheirOwnCircuit() {
        when(commercialAnalysisClient.getAnalysisPeriods()).thenThrow(feignError(503));

        assertThatThrownBy(() -> adapter.defaultPeriodCode()).isInstanceOf(AiReportException.class);

        assertThat(registry.circuitBreaker(InternalResponseSupport.COMMERCIAL_SERVICE_PERIODS).getMetrics().getNumberOfFailedCalls()).isEqualTo(1);
        assertThat(registry.circuitBreaker(InternalResponseSupport.COMMERCIAL_SERVICE).getMetrics().getNumberOfBufferedCalls()).isZero();
    }

    private static Response<AnalysisPeriodsClientResponse> periods(String defaultPeriodCode) {
        List<String> available = defaultPeriodCode == null ? List.of() : List.of(defaultPeriodCode);
        return Response.success(new AnalysisPeriodsClientResponse(defaultPeriodCode, available, "test-snapshot", "2026-10-01T09:00:00+09:00"));
    }

    private static FeignException feignError(int status) {
        Request request = Request.create(
            Request.HttpMethod.GET, "/api/v1/commercials/periods", Map.of(), null, StandardCharsets.UTF_8, new RequestTemplate());
        feign.Response response = feign.Response.builder()
            .status(status)
            .reason("test")
            .request(request)
            .headers(Map.of())
            .build();
        return FeignException.errorStatus("GET /api/v1/commercials/periods", response);
    }

    private static final class MutableClock extends Clock {

        private volatile Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("Asia/Seoul");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
