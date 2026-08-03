package com.followfollowme.nowdoboss.domainlayer.commercial.application.exception;

/**
 * 상권 요청 검증 메시지 카탈로그 (COMMERCIAL_1xx).
 * 형식: {@code "코드:사용자 메시지"} — ValidationErrorSupport가 접두어를 분리한다.
 */
public final class CommercialValidationMessage {

    public static final String TOP_N_INVALID = "COMMERCIAL_101:topN은 5 이상 30 이하여야 합니다.";

    private CommercialValidationMessage() {
    }
}
