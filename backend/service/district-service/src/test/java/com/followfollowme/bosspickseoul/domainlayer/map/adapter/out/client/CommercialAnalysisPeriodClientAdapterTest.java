package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.CommercialAnalysisPeriodClient;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.dto.AnalysisPeriodsClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.global.properties.MapAnalysisPeriodProperties;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
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
 * 지도의 기본 분기 메모가 TTL·실패 백오프·stale 을 지키고, 분석 호출과 다른 서킷을 쓰는지 확인한다(이슈 #464).
 */
@ExtendWith(MockitoExtension.class)
class CommercialAnalysisPeriodClientAdapterTest {

    private static final Duration TTL = Duration.ofMinutes(5);

    @Mock
    private CommercialAnalysisPeriodClient client;

    private final CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();
    private MutableClock clock;
    private CommercialAnalysisPeriodClientAdapter adapter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-01T00:00:00Z"));
        adapter = new CommercialAnalysisPeriodClientAdapter(
            client, new InternalResponseSupport(registry, new ObjectMapper()), new MapAnalysisPeriodProperties(TTL), clock);
    }

    @Test
    @DisplayName("TTL 안에서는 다시 묻지 않고 TTL 이 지나면 새 기본 분기를 받는다")
    void memoizesWithinTheTtl() {
        when(client.getAnalysisPeriods()).thenReturn(periods("20261"), periods("20262"));

        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(TTL.minusSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(Duration.ofSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20262");

        verify(client, times(2)).getAnalysisPeriods();
    }

    @Test
    @DisplayName("갱신이 실패하면 마지막 성공값을 내고 다음 시도는 TTL 뒤로 미룬다")
    void servesStaleWhenRefreshFails() {
        when(client.getAnalysisPeriods()).thenReturn(periods("20261")).thenThrow(feignError(503)).thenReturn(periods("20262"));

        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(TTL);
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        clock.advance(TTL.minusSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
        verify(client, times(2)).getAnalysisPeriods();

        clock.advance(Duration.ofSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20262");
    }

    @Test
    @DisplayName("한 번도 받지 못했으면 MAP_011(503)이고 백오프 동안은 다시 묻지 않는다")
    void coldFailureBacksOff() {
        when(client.getAnalysisPeriods()).thenThrow(feignError(503)).thenReturn(periods("20261"));

        assertUnavailable();
        clock.advance(Duration.ofSeconds(CommercialAnalysisPeriodClientAdapter.FAILURE_BACKOFF_SECONDS - 1));
        assertUnavailable();
        verify(client, times(1)).getAnalysisPeriods();

        clock.advance(Duration.ofSeconds(1));
        assertThat(adapter.defaultPeriodCode()).isEqualTo("20261");
    }

    @Test
    @DisplayName("/periods 실패는 기본 분기 전용 서킷에만 집계되고 분석 호출 서킷은 건드리지 않는다")
    void periodFailuresUseTheirOwnCircuit() {
        when(client.getAnalysisPeriods()).thenThrow(feignError(503));

        assertUnavailable();

        assertThat(registry.circuitBreaker(InternalResponseSupport.COMMERCIAL_SERVICE_PERIODS).getMetrics().getNumberOfFailedCalls()).isEqualTo(1);
        assertThat(registry.circuitBreaker(InternalResponseSupport.COMMERCIAL_SERVICE).getMetrics().getNumberOfBufferedCalls()).isZero();
    }

    @Test
    @DisplayName("commercial 이 기본 분기를 정하지 못했으면(200 + null) MAP_011 이지만 서킷 실패로 집계되지 않는다")
    void nullDefaultIsUnavailableButNotACircuitFailure() {
        when(client.getAnalysisPeriods()).thenReturn(periods(null));

        assertUnavailable();

        assertThat(registry.circuitBreaker(InternalResponseSupport.COMMERCIAL_SERVICE_PERIODS).getMetrics().getNumberOfFailedCalls()).isZero();
        assertThat(registry.circuitBreaker(InternalResponseSupport.COMMERCIAL_SERVICE_PERIODS).getMetrics().getNumberOfSuccessfulCalls()).isEqualTo(1);
    }

    @Test
    @DisplayName("동시 호출에서 늦게 끝난 실패는 먼저 받은 성공 메모를 덮지 않고 그 값을 돌려준다")
    void lateFailureDoesNotOverwriteAConcurrentSuccess() throws Exception {
        CountDownLatch failureEntered = new CountDownLatch(1);
        CountDownLatch releaseFailure = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        when(client.getAnalysisPeriods()).thenAnswer(invocation -> {
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

        assertThat(slowFailure.get(5, TimeUnit.SECONDS)).isEqualTo("20261");
        assertThat(adapter.defaultPeriodCode()).as("메모는 성공값 그대로다").isEqualTo("20261");
        verify(client, times(2)).getAnalysisPeriods();
    }

    @Test
    @DisplayName("동시 호출에서 먼저 끝난 실패의 백오프 메모는 늦게 끝난 성공이 덮어쓴다")
    void lateSuccessOverwritesAConcurrentFailureBackoff() throws Exception {
        CountDownLatch successEntered = new CountDownLatch(1);
        CountDownLatch releaseSuccess = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        when(client.getAnalysisPeriods()).thenAnswer(invocation -> {
            if (calls.incrementAndGet() == 1) {
                successEntered.countDown();
                releaseSuccess.await(5, TimeUnit.SECONDS);
                return periods("20261");
            }
            throw feignError(503);
        });

        CompletableFuture<String> slowSuccess = CompletableFuture.supplyAsync(adapter::defaultPeriodCode);
        assertThat(successEntered.await(5, TimeUnit.SECONDS)).isTrue();
        assertUnavailable();
        releaseSuccess.countDown();

        assertThat(slowSuccess.get(5, TimeUnit.SECONDS)).isEqualTo("20261");
        assertThat(adapter.defaultPeriodCode()).as("백오프 메모가 남지 않는다").isEqualTo("20261");
        verify(client, times(2)).getAnalysisPeriods();
    }

    @Test
    @DisplayName("아는 기본 분기는 원격 호출 없이 마지막 성공값을 돌려주고, 받은 적이 없으면 비어 있다")
    void lastKnownDefaultNeverCallsRemote() {
        when(client.getAnalysisPeriods()).thenThrow(feignError(503)).thenReturn(periods("20261"));

        assertUnavailable();
        assertThat(adapter.lastKnownDefaultPeriodCode()).as("백오프 메모에는 값이 없다").isEmpty();

        clock.advance(Duration.ofSeconds(CommercialAnalysisPeriodClientAdapter.FAILURE_BACKOFF_SECONDS));
        adapter.defaultPeriodCode();
        clock.advance(TTL.multipliedBy(3));

        assertThat(adapter.lastKnownDefaultPeriodCode()).as("만료됐어도 마지막 성공값").contains("20261");
        verify(client, times(2)).getAnalysisPeriods();
    }

    private void assertUnavailable() {
        assertThatThrownBy(() -> adapter.defaultPeriodCode())
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
    }

    private static Response<AnalysisPeriodsClientResponse> periods(String defaultPeriodCode) {
        return Response.success(new AnalysisPeriodsClientResponse(defaultPeriodCode));
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
