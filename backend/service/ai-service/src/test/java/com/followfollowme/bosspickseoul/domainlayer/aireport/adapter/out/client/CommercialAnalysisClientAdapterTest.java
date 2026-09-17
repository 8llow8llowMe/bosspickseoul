package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.CommercialAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import feign.Response;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 원천 서비스의 404 를 어디까지 흡수하는지 고정한다.
 *
 * <p>commercial-service 의 {@code /commercials/{code}/income} 은 행이 없으면 404 를 주는 것이 의도된 계약이고,
 * 2024년 이후 1,650개 상권 중 560곳이 그 상태다. 그 404 를 {@code SOURCE_DATA_UNAVAILABLE} 로 바꾸면
 * 지표 하나 때문에 그 560개 상권의 AI 리포트가 통째로 실패한다. 반대로 5xx·타임아웃까지 흡수하면
 * 상대 서비스 장애가 "데이터 없는 리포트" 로 조용히 넘어간다. (이슈 #413)
 */
@ExtendWith(MockitoExtension.class)
class CommercialAnalysisClientAdapterTest {

    private static final String COMMERCIAL = "3110971";
    private static final String PERIOD = "20261";

    @Mock
    private CommercialAnalysisClient commercialAnalysisClient;

    private CommercialAnalysisClientAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new CommercialAnalysisClientAdapter(
            commercialAnalysisClient, new InternalResponseSupport(CircuitBreakerRegistry.ofDefaults()));
    }

    @Test
    @DisplayName("소득소비 404 는 결측(null)으로 흡수해 리포트 생성을 계속한다")
    void getCommercialIncome_notFound_returnsNullInsteadOfFailingTheWholeReport() {
        when(commercialAnalysisClient.getCommercialIncome(COMMERCIAL, PERIOD)).thenThrow(feignError(404));

        assertThat(adapter.getCommercialIncome(COMMERCIAL, PERIOD)).isNull();
    }

    @Test
    @DisplayName("소득소비 5xx 는 흡수하지 않고 원천 데이터 불가로 전파한다")
    void getCommercialIncome_serverError_stillFailsAsSourceDataUnavailable() {
        when(commercialAnalysisClient.getCommercialIncome(COMMERCIAL, PERIOD)).thenThrow(feignError(500));

        assertThatThrownBy(() -> adapter.getCommercialIncome(COMMERCIAL, PERIOD))
            .isInstanceOf(AiReportException.class)
            .extracting(exception -> ((AiReportException) exception).getErrorCode())
            .isEqualTo(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
    }

    @Test
    @DisplayName("결측 허용은 소득소비에만 적용된다 — 다른 지표의 404 는 그대로 실패한다")
    void otherMetrics_notFound_stillFailAsSourceDataUnavailable() {
        when(commercialAnalysisClient.getCommercialFootTraffic(COMMERCIAL, PERIOD)).thenThrow(feignError(404));

        assertThatThrownBy(() -> adapter.getCommercialFootTraffic(COMMERCIAL, PERIOD))
            .isInstanceOf(AiReportException.class)
            .extracting(exception -> ((AiReportException) exception).getErrorCode())
            .isEqualTo(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
    }

    /** Feign 기본 디코더가 상태 코드별 하위 타입({@code FeignException.NotFound} 등)을 고르는 경로를 그대로 쓴다. */
    private FeignException feignError(int status) {
        Request request = Request.create(
            Request.HttpMethod.GET, "/api/v1/commercials", Map.of(), null, StandardCharsets.UTF_8, new RequestTemplate());
        Response response = Response.builder()
            .status(status)
            .reason("test")
            .request(request)
            .headers(Map.of())
            .build();
        return FeignException.errorStatus("GET /api/v1/commercials", response);
    }
}
