package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import feign.FeignException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InternalResponseSupport {

    // 서킷브레이커 인스턴스명(application.yml resilience4j.circuitbreaker.instances 키와 일치).
    // Eureka 등록명(-dev/-prod 접미사)과 무관한 논리 서비스명을 쓴다.
    public static final String COMMERCIAL_SERVICE = "commercial-service";
    public static final String DISTRICT_SERVICE = "district-service";

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public <T> T unwrap(String targetService, Response<T> response) {
        // AI_001 원인 추적을 위해 어느 서비스 응답이 어떤 형태로 비정상이었는지 남긴다.
        if (response == null || response.dataHeader() == null || !response.dataHeader().success()) {
            log.warn("원천 데이터 응답이 실패 상태입니다. targetService={} resultCode={} resultMessage={}",
                targetService,
                response == null || response.dataHeader() == null ? null : response.dataHeader().resultCode(),
                response == null || response.dataHeader() == null ? "dataHeader 없음" : response.dataHeader().resultMessage());
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }

        T dataBody = response.dataBody();
        if (dataBody == null) {
            log.warn("원천 데이터 응답에 dataBody가 없습니다. targetService={}", targetService);
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
            log.warn("원천 데이터 서비스 호출에 실패했습니다. targetService={} cause={}: {}",
                targetService, exception.getClass().getSimpleName(), exception.getMessage());
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE, exception);
        }
        return unwrap(targetService, response);
    }
}
