package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception;

import lombok.Getter;

/**
 * 같은 화면 상태가 이미 보관함에 있을 때 던진다.
 * 기존 항목 아이디를 함께 실어, 프론트가 "이미 저장됨 → 눌러서 해제" 토글을
 * 추가 조회 없이 구현할 수 있게 409 응답 dataBody 로 내려준다.
 */
@Getter
public class AnalysisBookmarkDuplicateException extends AnalysisBookmarkException {

    private final long existingBookmarkId;

    public AnalysisBookmarkDuplicateException(long existingBookmarkId) {
        super(AnalysisBookmarkErrorCode.ALREADY_BOOKMARKED);
        this.existingBookmarkId = existingBookmarkId;
    }
}
