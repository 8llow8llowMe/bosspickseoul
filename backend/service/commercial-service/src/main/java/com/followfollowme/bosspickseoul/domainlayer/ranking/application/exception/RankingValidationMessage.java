package com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception;

/**
 * 요청 필드 검증 메시지. coding-conventions §8-2 에 따라 "CODE:사용자 메시지" 형식으로 정의해
 * ValidationErrorSupport 가 필드별 오류 코드를 분리해 내려줄 수 있게 한다.
 */
public final class RankingValidationMessage {

    public static final String PAGE_SIZE_INVALID = "RANKING_101:조회 개수는 1 이상 50 이하여야 합니다.";

    private RankingValidationMessage() {
    }
}
