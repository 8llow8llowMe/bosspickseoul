package com.followfollowme.nowdoboss.domainlayer.member.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum BookmarkErrorCode {

    DUPLICATE_BOOKMARK("BOOKMARK_001", "이미 북마크한 대상입니다.", HttpStatus.CONFLICT),
    NOT_FOUND_BOOKMARK("BOOKMARK_002", "존재하지 않는 북마크입니다.", HttpStatus.NOT_FOUND),
    FORBIDDEN_BOOKMARK_ACCESS("BOOKMARK_003", "본인 북마크만 삭제할 수 있습니다.", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
