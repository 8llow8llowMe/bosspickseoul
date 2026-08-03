package com.followfollowme.nowdoboss.domainlayer.community.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommunityErrorCode {

    INVALID_TARGET_TYPE("COMMUNITY_001", "유효하지 않은 커뮤니티 대상 타입입니다.", HttpStatus.BAD_REQUEST),
    INVALID_SORT_TYPE("COMMUNITY_002", "유효하지 않은 정렬 타입입니다.", HttpStatus.BAD_REQUEST),
    INVALID_ORDER_TYPE("COMMUNITY_003", "유효하지 않은 정렬 방향입니다.", HttpStatus.BAD_REQUEST),
    TARGET_NOT_FOUND("COMMUNITY_004", "존재하지 않는 커뮤니티 대상입니다.", HttpStatus.NOT_FOUND),
    POST_NOT_FOUND("COMMUNITY_005", "게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    COMMENT_NOT_FOUND("COMMUNITY_006", "댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    FORBIDDEN_POST_ACCESS("COMMUNITY_007", "본인 게시글만 수정하거나 삭제할 수 있습니다.", HttpStatus.FORBIDDEN),
    FORBIDDEN_COMMENT_ACCESS("COMMUNITY_008", "본인 댓글만 삭제할 수 있습니다.", HttpStatus.FORBIDDEN),
    DUPLICATE_REPORT("COMMUNITY_009", "이미 신고한 대상입니다.", HttpStatus.CONFLICT),
    INVALID_REPORT_TARGET_KIND("COMMUNITY_010", "유효하지 않은 신고 대상 타입입니다.", HttpStatus.BAD_REQUEST),
    REPORT_NOT_FOUND("COMMUNITY_011", "신고를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    REPORT_ALREADY_PROCESSED("COMMUNITY_012", "이미 처리된 신고입니다.", HttpStatus.CONFLICT),

    // 요청 검증(Bean Validation) 전용 코드 — 1xx 대역. DTO 메시지의 "CODE:메시지" 접두어와 짝을 이룬다.
    INVALID_REQUEST("COMMUNITY_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    TARGET_TYPE_REQUIRED("COMMUNITY_101", "게시글 대상 타입은 필수입니다.", HttpStatus.BAD_REQUEST),
    TARGET_CODE_REQUIRED("COMMUNITY_102", "게시글 대상 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    TITLE_REQUIRED("COMMUNITY_103", "제목은 필수입니다.", HttpStatus.BAD_REQUEST),
    TITLE_LENGTH_INVALID("COMMUNITY_104", "제목은 120자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    CONTENT_REQUIRED("COMMUNITY_105", "본문은 필수입니다.", HttpStatus.BAD_REQUEST),
    CONTENT_LENGTH_INVALID("COMMUNITY_106", "본문은 5000자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    COMMENT_CONTENT_REQUIRED("COMMUNITY_107", "댓글 내용은 필수입니다.", HttpStatus.BAD_REQUEST),
    COMMENT_CONTENT_LENGTH_INVALID("COMMUNITY_108", "댓글은 1000자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    REPORT_TARGET_KIND_REQUIRED("COMMUNITY_109", "신고 대상 타입은 필수입니다.", HttpStatus.BAD_REQUEST),
    REPORT_REASON_REQUIRED("COMMUNITY_110", "신고 사유는 필수입니다.", HttpStatus.BAD_REQUEST),
    REPORT_REASON_LENGTH_INVALID("COMMUNITY_111", "신고 사유는 500자 이하만 가능합니다.", HttpStatus.BAD_REQUEST),
    MODERATION_DECISION_REQUIRED("COMMUNITY_112", "처리 결정은 필수입니다.", HttpStatus.BAD_REQUEST),
    LEFT_COMMERCIAL_CODE_REQUIRED("COMMUNITY_113", "좌측 상권 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    RIGHT_COMMERCIAL_CODE_REQUIRED("COMMUNITY_114", "우측 상권 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    SERVICE_CODE_REQUIRED("COMMUNITY_115", "서비스 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    PERIOD_CODE_REQUIRED("COMMUNITY_116", "기준 분기 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("COMMUNITY_117", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
