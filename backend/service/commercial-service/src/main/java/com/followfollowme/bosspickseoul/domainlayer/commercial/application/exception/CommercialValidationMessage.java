package com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception;

/**
 * 상권 요청 검증 메시지 카탈로그 (COMMERCIAL_1xx).
 * 형식: {@code "코드:사용자 메시지"} — ValidationErrorSupport가 접두어를 분리한다.
 */
public final class CommercialValidationMessage {

    public static final String TOP_N_INVALID = "COMMERCIAL_101:topN은 5 이상 30 이하여야 합니다.";

    // COMMERCIAL_102 는 타입 불일치(PARAMETER_TYPE_INVALID)로 이미 배포돼 있어 103부터 이어 붙인다.
    public static final String LEFT_COMMERCIAL_CODE_REQUIRED = "COMMERCIAL_103:좌측 상권 코드는 필수입니다.";
    public static final String RIGHT_COMMERCIAL_CODE_REQUIRED = "COMMERCIAL_104:우측 상권 코드는 필수입니다.";
    public static final String SERVICE_CODE_REQUIRED = "COMMERCIAL_105:서비스 코드는 필수입니다.";

    private CommercialValidationMessage() {
    }
}
