package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.client.support;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.exception.CommercialException;
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
    public static final String DISTRICT_SERVICE = "district-service";

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    /**
     * 서킷은 전송 실패(5xx·타임아웃)만 집계하도록 Feign 호출만 감싼다.
     * dataBody가 없는 응답은 조회 결과 없음으로 보고 null을 반환해 어댑터의 도메인 판단에 맡긴다.
     */
    public <T> T requestAndUnwrap(String targetService, Supplier<Response<T>> requester) {
        Response<T> response;
        try {
            response = circuitBreakerRegistry.circuitBreaker(targetService).executeSupplier(requester::get);
        } catch (CallNotPermittedException | FeignException exception) {
            throw new CommercialException(CommercialErrorCode.INTERNAL_SERVICE_UNAVAILABLE, exception);
        }
        return response == null ? null : response.dataBody();
    }
}
