package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AnalysisBookmarkErrorCode {

    BOOKMARK_NOT_FOUND("ANALYSIS_BOOKMARK_001", "요청하신 보관함 항목을 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    ALREADY_BOOKMARKED("ANALYSIS_BOOKMARK_002", "이미 보관함에 저장된 분석 화면입니다.", HttpStatus.CONFLICT),
    PAYLOAD_NOT_OBJECT("ANALYSIS_BOOKMARK_003", "화면 상태(payload)는 JSON 객체여야 합니다.", HttpStatus.BAD_REQUEST),
    PAYLOAD_TOO_LARGE("ANALYSIS_BOOKMARK_004", "화면 상태(payload)가 허용 크기를 초과했습니다.", HttpStatus.BAD_REQUEST),
    INVALID_SHARE_TARGET_TYPE("ANALYSIS_BOOKMARK_005", "지원하지 않는 분석 화면 타입입니다.", HttpStatus.BAD_REQUEST),
    BOOKMARK_LIMIT_EXCEEDED("ANALYSIS_BOOKMARK_006", "보관함이 가득 찼습니다. 기존 항목을 삭제한 뒤 다시 저장해 주세요.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
