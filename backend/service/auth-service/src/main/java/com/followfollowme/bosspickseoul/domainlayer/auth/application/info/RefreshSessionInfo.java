package com.followfollowme.bosspickseoul.domainlayer.auth.application.info;

import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record RefreshSessionInfo(
    String sessionId,
    String deviceInfo,
    LocalDateTime createdAt,
    LocalDateTime lastUsedAt,
    // 요청 쿠키의 refresh 토큰과 같은 세션이면 true — FE 가 "현재 기기" 배지와 해제 버튼 노출을 분기한다.
    boolean current
) {
}
