package com.followfollowme.bosspickseoul.domainlayer.community.application.exception;

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
    CONCURRENT_REACTION("COMMUNITY_013", "요청이 동시에 처리되었습니다. 잠시 후 다시 시도해 주세요.", HttpStatus.CONFLICT),

    // 요청 검증(Bean Validation) 대역 — 1xx.
    // 필드별 코드(COMMUNITY_101~116)는 CommunityValidationMessage 가 단일 기준점이며, 여기서는 중복 정의하지 않는다.
    INVALID_REQUEST("COMMUNITY_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("COMMUNITY_117", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
