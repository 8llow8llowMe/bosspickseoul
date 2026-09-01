package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

import java.time.LocalDateTime;

/**
 * 기기 세션의 부가 정보. 세션 목록 화면에서 "어느 기기의 언제 로그인"인지 보여주기 위해
 * refresh 토큰과 함께 저장한다. createdAt 은 최초 로그인 시각으로, 토큰이 회전해도 유지된다.
 */
public record RefreshSessionMeta(String deviceInfo, LocalDateTime createdAt) {
}
