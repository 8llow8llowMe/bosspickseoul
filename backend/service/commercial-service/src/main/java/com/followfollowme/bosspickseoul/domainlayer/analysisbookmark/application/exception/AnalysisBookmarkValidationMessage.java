package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception;

public final class AnalysisBookmarkValidationMessage {

    public static final String SHARE_TYPE_REQUIRED = "분석 화면 타입은 필수입니다.";
    public static final String PAYLOAD_REQUIRED = "화면 상태(payload)는 필수입니다.";
    public static final String BOOKMARK_NAME_LENGTH = "보관함 이름은 50자 이하만 가능합니다.";

    private AnalysisBookmarkValidationMessage() {
    }
}
