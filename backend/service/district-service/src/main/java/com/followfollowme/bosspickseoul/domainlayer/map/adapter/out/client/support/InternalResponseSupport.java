package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
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

    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final ObjectMapper objectMapper;

    /**
     * 서킷은 전송 실패(5xx·타임아웃)만 집계하도록 Feign 호출만 감싼다.
     * dataBody가 없는 응답은 데이터 부족으로 보고 null을 반환해 상위 폴백 처리에 맡긴다.
     *
     * <p>404 는 상대 서비스 장애가 아니라 "해당 데이터 없음"(예: 특정 분기의 매출 부재)이므로
     * 503 이 아닌 404(MAP_009)로 번역하고, 하위 응답의 resultMessage 를 그대로 전달해
     * 프론트가 재시도 대신 안내 문구를 노출할 수 있게 한다.
     */
    public <T> T requestAndUnwrap(String targetService, Supplier<Response<T>> requester) {
        Response<T> response;
        try {
            response = circuitBreakerRegistry.circuitBreaker(targetService).executeSupplier(requester::get);
        } catch (FeignException.NotFound exception) {
            throw new MapException(MapErrorCode.UPSTREAM_DATA_NOT_FOUND, upstreamMessage(exception));
        } catch (CallNotPermittedException | FeignException exception) {
            throw new MapException(MapErrorCode.INTERNAL_SERVICE_UNAVAILABLE, exception);
        }
        return response == null ? null : response.dataBody();
    }

    private String upstreamMessage(FeignException.NotFound exception) {
        try {
            JsonNode message = objectMapper.readTree(exception.contentUTF8())
                .path("dataHeader").path("resultMessage");
            if (message.isTextual() && !message.asText().isBlank()) {
                return message.asText();
            }
        } catch (Exception ignored) {
            // 하위 응답이 공통 규약(JSON Response) 형태가 아니면 기본 메시지로 대체한다
        }
        return MapErrorCode.UPSTREAM_DATA_NOT_FOUND.getMessage();
    }
}
