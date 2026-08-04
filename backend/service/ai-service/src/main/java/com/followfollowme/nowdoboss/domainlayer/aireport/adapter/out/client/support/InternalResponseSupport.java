package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import feign.FeignException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InternalResponseSupport {

    // 서킷브레이커 인스턴스명(application.yml resilience4j.circuitbreaker.instances 키와 일치).
    // Eureka 등록명(-dev/-prod 접미사)과 무관한 논리 서비스명을 쓴다.
    public static final String COMMERCIAL_SERVICE = "commercial-service";
    public static final String DISTRICT_SERVICE = "district-service";

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public <T> T unwrap(Response<T> response) {
        if (response == null || response.dataHeader() == null || !response.dataHeader().success()) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }

        T dataBody = response.dataBody();
        if (dataBody == null) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }

        return dataBody;
    }

    public <T> T requestAndUnwrap(String targetService, Supplier<Response<T>> requester) {
        Response<T> response;
        try {
            // 서킷은 전송 실패(5xx·타임아웃)만 집계하도록 Feign 호출만 감싼다.
            // 응답 언래핑 실패(dataBody 없음 등)는 상대 서비스 장애가 아니므로 밖에서 처리한다.
            response = circuitBreakerRegistry.circuitBreaker(targetService).executeSupplier(requester::get);
        } catch (CallNotPermittedException | FeignException exception) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE, exception);
        }
        return unwrap(response);
    }
}
