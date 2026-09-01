package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query;

import java.time.LocalDateTime;

/**
 * 로그인 중인 기기 세션 한 건. lastUsedAt 은 마지막 토큰 발급/갱신 시각(세션 인덱스 score)이다.
 */
public record RefreshSessionQueryResult(
    String sessionId,
    String deviceInfo,
    LocalDateTime createdAt,
    LocalDateTime lastUsedAt
) {
}
