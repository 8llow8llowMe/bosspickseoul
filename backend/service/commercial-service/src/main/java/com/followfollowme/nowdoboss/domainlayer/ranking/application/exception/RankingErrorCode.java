package com.followfollowme.nowdoboss.domainlayer.ranking.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum RankingErrorCode {

    INVALID_AREA_TYPE("RANKING_001", "유효하지 않은 분석 영역 타입입니다.", HttpStatus.BAD_REQUEST),
    RANKING_STORE_UNAVAILABLE("RANKING_002", "인기 순위 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", HttpStatus.SERVICE_UNAVAILABLE),
    INVALID_SIZE("RANKING_003", "조회 개수는 1 이상 50 이하만 가능합니다.", HttpStatus.BAD_REQUEST);

    // 검증 폴백/타입 불일치는 서비스 공통 CommercialErrorCode 1xx 를 사용한다.

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
