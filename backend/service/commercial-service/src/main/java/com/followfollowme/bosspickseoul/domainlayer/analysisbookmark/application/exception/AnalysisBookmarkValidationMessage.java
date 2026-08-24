package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception;

/**
 * 요청 필드 검증 메시지. coding-conventions §8-2 에 따라 "CODE:사용자 메시지" 형식으로 정의해
 * ValidationErrorSupport 가 필드별 오류 코드를 분리해 내려줄 수 있게 한다.
 */
public final class AnalysisBookmarkValidationMessage {

    public static final String SHARE_TYPE_REQUIRED = "ANALYSIS_BOOKMARK_101:분석 화면 타입은 필수입니다.";
    public static final String PAYLOAD_REQUIRED = "ANALYSIS_BOOKMARK_102:화면 상태(payload)는 필수입니다.";
    public static final String BOOKMARK_NAME_LENGTH = "ANALYSIS_BOOKMARK_103:보관함 이름은 50자 이하만 가능합니다.";
    public static final String PAGE_MIN = "ANALYSIS_BOOKMARK_104:페이지는 0 이상이어야 합니다.";
    public static final String SIZE_RANGE = "ANALYSIS_BOOKMARK_105:페이지 크기는 1 이상 50 이하만 가능합니다.";

    private AnalysisBookmarkValidationMessage() {
    }
}
