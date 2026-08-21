package com.followfollowme.bosspickseoul.domainlayer.areaboundary.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * batch-service는 웹 계층이 없어 HttpStatus는 두지 않는다.
 * 커스텀 코드는 배치 실패 로그에서 원인을 식별하는 용도로 사용한다.
 */
@Getter
@RequiredArgsConstructor
public enum AreaBoundaryErrorCode {

    FILE_LOAD_FAILED("AREA_BOUNDARY_001", "영역 JSON 파일 로딩에 실패했습니다. (%s: %s)");

    private final String code;
    private final String message;
}
