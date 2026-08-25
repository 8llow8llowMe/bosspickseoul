package com.followfollowme.bosspickseoul.domainlayer.policy.application.exception;

/**
 * 정책 요청 검증 메시지 카탈로그 (POLICY_1xx).
 * 형식과 취지는 다른 도메인의 {@code *ValidationMessage} 와 같다.
 */
public final class PolicyValidationMessage {

    public static final String PAGE_SIZE_INVALID = "POLICY_101:조회 개수는 1 이상 50 이하여야 합니다.";

    private PolicyValidationMessage() {
    }
}
