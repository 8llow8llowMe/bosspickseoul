package com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.support;

import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * provider 호출에서 발생하는 WebClient 예외를 도메인 예외로 변환한다.
 *
 * <p>인가코드 재사용/만료(4xx)는 사용자 조작(콜백 새로고침)으로 흔히 발생하므로 400으로,
 * provider 장애·타임아웃(5xx/네트워크)은 502로 구분해 500 스택 노출을 막는다.
 */
@Slf4j
public final class OAuthApiCallSupport {

    private OAuthApiCallSupport() {
    }

    public static <T> T call(Supplier<T> apiCall, OAuthProvider provider) {
        try {
            return apiCall.get();
        } catch (WebClientResponseException e) {
            log.warn("[OAuthApiCall] provider 응답 오류: provider={}, status={}, body={}",
                provider, e.getStatusCode(), e.getResponseBodyAsString());
            throw new AuthException(e.getStatusCode().is4xxClientError()
                ? AuthErrorCode.OAUTH_AUTHORIZATION_FAILED
                : AuthErrorCode.OAUTH_PROVIDER_UNAVAILABLE);
        } catch (WebClientRequestException e) {
            log.error("[OAuthApiCall] provider 통신 실패: provider={}, error={}", provider, e.getMessage());
            throw new AuthException(AuthErrorCode.OAUTH_PROVIDER_UNAVAILABLE);
        }
    }
}
