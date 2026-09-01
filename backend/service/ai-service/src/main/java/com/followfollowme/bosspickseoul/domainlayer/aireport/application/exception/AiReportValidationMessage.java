package com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception;

/**
 * AI 리포트 요청 검증 메시지 카탈로그 (AI_1xx).
 * 형식: {@code "코드:사용자 메시지"} — ValidationErrorSupport가 접두어를 분리한다.
 *
 * <p>AI_100(폴백)·AI_101(타입 불일치)은 ErrorCode enum 이 이미 쓰고 있어 102부터 이어 붙인다.
 */
public final class AiReportValidationMessage {

    public static final String LEFT_COMMERCIAL_CODE_REQUIRED = "AI_102:좌측 상권 코드는 필수입니다.";
    public static final String RIGHT_COMMERCIAL_CODE_REQUIRED = "AI_103:우측 상권 코드는 필수입니다.";
    public static final String SERVICE_CODE_REQUIRED = "AI_104:서비스 코드는 필수입니다.";

    private AiReportValidationMessage() {
    }
}
