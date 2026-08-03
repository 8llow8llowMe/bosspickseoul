package com.followfollowme.nowdoboss.domainlayer.member.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum BookmarkErrorCode {

    DUPLICATE_BOOKMARK("BOOKMARK_001", "이미 북마크한 대상입니다.", HttpStatus.CONFLICT),
    NOT_FOUND_BOOKMARK("BOOKMARK_002", "존재하지 않는 북마크입니다.", HttpStatus.NOT_FOUND),
    FORBIDDEN_BOOKMARK_ACCESS("BOOKMARK_003", "본인 북마크만 삭제할 수 있습니다.", HttpStatus.FORBIDDEN),

    // 요청 검증(Bean Validation) 전용 코드 — 1xx 대역.
    TARGET_TYPE_REQUIRED("BOOKMARK_101", "북마크 대상 타입은 필수입니다.", HttpStatus.BAD_REQUEST),
    TARGET_CODE_REQUIRED("BOOKMARK_102", "북마크 대상 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    TARGET_CODE_LENGTH_INVALID("BOOKMARK_103", "북마크 대상 코드는 20자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    TARGET_NAME_REQUIRED("BOOKMARK_104", "북마크 대상 이름은 필수입니다.", HttpStatus.BAD_REQUEST),
    TARGET_NAME_LENGTH_INVALID("BOOKMARK_105", "북마크 대상 이름은 80자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    PAGE_SIZE_INVALID("BOOKMARK_106", "조회 개수는 1 이상 50 이하여야 합니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
