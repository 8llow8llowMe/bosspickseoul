package com.followfollowme.bosspickseoul.domainlayer.member.application.exception;

/**
 * 북마크 요청 검증 메시지 카탈로그 (BOOKMARK_1xx).
 * 형식과 취지는 {@link MemberValidationMessage} 와 같다.
 */
public final class BookmarkValidationMessage {

    public static final String TARGET_TYPE_REQUIRED = "BOOKMARK_101:북마크 대상 타입은 필수입니다.";
    public static final String TARGET_CODE_REQUIRED = "BOOKMARK_102:북마크 대상 코드는 필수입니다.";
    public static final String TARGET_CODE_LENGTH_INVALID = "BOOKMARK_103:북마크 대상 코드는 20자 이하만 가능합니다.";
    public static final String TARGET_NAME_REQUIRED = "BOOKMARK_104:북마크 대상 이름은 필수입니다.";
    public static final String TARGET_NAME_LENGTH_INVALID = "BOOKMARK_105:북마크 대상 이름은 80자 이하만 가능합니다.";
    public static final String PAGE_SIZE_INVALID = "BOOKMARK_106:조회 개수는 1 이상 50 이하여야 합니다.";

    private BookmarkValidationMessage() {
    }
}
