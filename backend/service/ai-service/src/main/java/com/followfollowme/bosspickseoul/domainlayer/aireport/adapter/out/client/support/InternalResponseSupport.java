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
        return request(targetService, requester, false);
    }

    /**
     * 404 만 "해당 분기에 데이터 없음"(null)으로 흡수하고 나머지는 그대로 전파한다.
     *
     * <p>peer 가 의도적으로 404 계약을 유지하는 단건 조회(예: {@code /commercials/{code}/income})에만 쓴다.
     * 2024년 이후 소득소비 행이 없는 상권이 560곳인데, 그 404 를 {@code SOURCE_DATA_UNAVAILABLE} 로 바꾸면
     * 지표 하나 때문에 리포트 생성이 통째로 실패한다. 5xx·타임아웃·서킷 열림은 계속 전파해야 하므로
     * {@link FeignException.NotFound} 만 골라 잡는다. 흡수는 adapter 안에서 끝내고
     * {@code FeignException} 을 application 으로 흘리지 않는다.
     */
    public <T> T requestAndUnwrapOrNullWhenNotFound(String targetService, Supplier<Response<T>> requester) {
        return request(targetService, requester, true);
    }

    private <T> T request(String targetService, Supplier<Response<T>> requester, boolean absentWhenNotFound) {
        Response<T> response;
        try {
            // 서킷은 전송 실패(5xx·타임아웃)만 집계하도록 Feign 호출만 감싼다.
            // 응답 언래핑 실패(dataBody 없음 등)는 상대 서비스 장애가 아니므로 밖에서 처리한다.
            response = circuitBreakerRegistry.circuitBreaker(targetService).executeSupplier(requester::get);
        } catch (FeignException.NotFound notFound) {
            if (!absentWhenNotFound) {
                throw sourceDataUnavailable(targetService, notFound);
            }
            log.info("원천 데이터가 해당 분기에 없습니다. targetService={} message={}", targetService, notFound.getMessage());
            return null;
        } catch (CallNotPermittedException | FeignException exception) {
            throw sourceDataUnavailable(targetService, exception);
        }
        return unwrap(targetService, response);
    }

    private AiReportException sourceDataUnavailable(String targetService, Exception exception) {
        log.warn("원천 데이터 서비스 호출에 실패했습니다. targetService={} cause={}: {}",
            targetService, exception.getClass().getSimpleName(), exception.getMessage());
        return new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE, exception);
    }
}
