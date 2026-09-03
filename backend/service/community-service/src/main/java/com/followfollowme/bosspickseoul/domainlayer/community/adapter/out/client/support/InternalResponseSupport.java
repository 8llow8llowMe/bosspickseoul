package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.client.support;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import feign.FeignException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 내부 서비스 Feign 호출 공통 처리 (commercial-service 의 동명 클래스와 같은 구조).
 * 예외 번역만 커뮤니티 도메인으로 다르다.
 */
@Component
@RequiredArgsConstructor
public class InternalResponseSupport {

    // 서킷브레이커 인스턴스명(application.yml resilience4j.circuitbreaker.instances 키와 일치).
    // Eureka 등록명(-dev/-prod 접미사)과 무관한 논리 서비스명을 쓴다.
    public static final String DISTRICT_SERVICE = "district-service";

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    /**
     * 서킷은 전송 실패(5xx·타임아웃)만 집계하도록 Feign 호출만 감싼다.
     *
     * <p>404 는 상대 서비스 장애가 아니라 "그런 코드 없음"이므로 null 로 돌려 어댑터의
     * 도메인 판단(TARGET_NOT_FOUND)에 맡긴다 — 커뮤니티는 사용자 입력 코드를 검증하는
     * 용도라 미존재 코드가 정상 경로다.
     */
    public <T> T requestAndUnwrap(String targetService, Supplier<Response<T>> requester) {
        Response<T> response;
        try {
            response = circuitBreakerRegistry.circuitBreaker(targetService).executeSupplier(requester::get);
        } catch (FeignException.NotFound exception) {
            return null;
        } catch (CallNotPermittedException | FeignException exception) {
            throw new CommunityException(CommunityErrorCode.REGION_SERVICE_UNAVAILABLE);
        }
        return response == null ? null : response.dataBody();
    }
}
