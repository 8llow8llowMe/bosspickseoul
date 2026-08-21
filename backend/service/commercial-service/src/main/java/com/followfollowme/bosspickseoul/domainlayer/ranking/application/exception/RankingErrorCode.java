package com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum RankingErrorCode {

    RANKING_STORE_UNAVAILABLE("RANKING_001", "인기 순위 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", HttpStatus.SERVICE_UNAVAILABLE),
    INVALID_SIZE("RANKING_002", "조회 개수는 1 이상 50 이하만 가능합니다.", HttpStatus.BAD_REQUEST);

    // areaType 은 enum RequestParam 바인딩이라 잘못된 값은 서비스 공통 COMMERCIAL_102(타입 불일치)로 응답한다.
    // 검증 폴백/타입 불일치는 서비스 공통 CommercialErrorCode 1xx 를 사용한다.

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
