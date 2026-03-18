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
    INVALID_REPORT_TARGET_KIND("COMMUNITY_010", "유효하지 않은 신고 대상 타입입니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
