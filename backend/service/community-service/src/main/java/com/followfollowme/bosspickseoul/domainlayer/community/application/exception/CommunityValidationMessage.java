package com.followfollowme.bosspickseoul.domainlayer.community.application.exception;

/**
 * 커뮤니티 요청 검증 메시지 카탈로그 (COMMUNITY_1xx).
 *
 * <p>Bean Validation의 {@code message}는 컴파일 상수만 받을 수 있어 enum을 직접 쓸 수 없다.
 * 코드와 메시지를 이 상수에 모아 DTO가 참조하게 하면, 오타나 삭제를 컴파일러가 잡고
 * 코드-메시지의 단일 기준점이 유지된다.
 *
 * <p>형식: {@code "코드:사용자 메시지"} — ValidationErrorSupport가 접두어를 분리한다.
 */
public final class CommunityValidationMessage {

    public static final String TARGET_TYPE_REQUIRED = "COMMUNITY_101:게시글 대상 타입은 필수입니다.";
    public static final String TARGET_CODE_REQUIRED = "COMMUNITY_102:게시글 대상 코드는 필수입니다.";
    public static final String TITLE_REQUIRED = "COMMUNITY_103:제목은 필수입니다.";
    public static final String TITLE_LENGTH_INVALID = "COMMUNITY_104:제목은 120자 이하만 가능합니다.";
    public static final String CONTENT_REQUIRED = "COMMUNITY_105:본문은 필수입니다.";
    public static final String CONTENT_LENGTH_INVALID = "COMMUNITY_106:본문은 5000자 이하만 가능합니다.";
    public static final String COMMENT_CONTENT_REQUIRED = "COMMUNITY_107:댓글 내용은 필수입니다.";
    public static final String COMMENT_CONTENT_LENGTH_INVALID = "COMMUNITY_108:댓글은 1000자 이하만 가능합니다.";
    public static final String REPORT_TARGET_KIND_REQUIRED = "COMMUNITY_109:신고 대상 타입은 필수입니다.";
    public static final String REPORT_REASON_REQUIRED = "COMMUNITY_110:신고 사유는 필수입니다.";
    public static final String REPORT_REASON_LENGTH_INVALID = "COMMUNITY_111:신고 사유는 500자 이하만 가능합니다.";
    public static final String MODERATION_DECISION_REQUIRED = "COMMUNITY_112:처리 결정은 필수입니다.";
    public static final String LEFT_COMMERCIAL_CODE_REQUIRED = "COMMUNITY_113:좌측 상권 코드는 필수입니다.";
    public static final String RIGHT_COMMERCIAL_CODE_REQUIRED = "COMMUNITY_114:우측 상권 코드는 필수입니다.";
    public static final String SERVICE_CODE_REQUIRED = "COMMUNITY_115:서비스 코드는 필수입니다.";
    public static final String PERIOD_CODE_REQUIRED = "COMMUNITY_116:기준 분기 코드는 필수입니다.";
    public static final String IMAGE_COUNT_INVALID = "COMMUNITY_118:이미지는 최대 5장까지 첨부할 수 있습니다.";

    private CommunityValidationMessage() {
    }
}
