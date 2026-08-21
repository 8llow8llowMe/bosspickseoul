package com.followfollowme.bosspickseoul.domainlayer.map.application.exception;

/**
 * 지도 요청 검증 메시지 카탈로그 (MAP_1xx).
 * 형식: {@code "코드:사용자 메시지"} — ValidationErrorSupport가 접두어를 분리한다.
 */
public final class MapValidationMessage {

    public static final String TOP_N_TOO_SMALL = "MAP_101:topN은 5 이상이어야 합니다.";
    public static final String TOP_N_TOO_LARGE = "MAP_102:topN은 30 이하여야 합니다.";

    private MapValidationMessage() {
    }
}
