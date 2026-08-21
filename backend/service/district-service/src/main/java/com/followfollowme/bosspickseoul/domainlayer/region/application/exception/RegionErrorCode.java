package com.followfollowme.bosspickseoul.domainlayer.region.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum RegionErrorCode {

    ADMINISTRATION_NOT_IN_DISTRICT("REGION_001", "행정동 코드(%s)가 해당 자치구(%s)에 속하지 않습니다.", HttpStatus.BAD_REQUEST),
    NOT_FOUND_DISTRICT("REGION_002", "해당 자치구 코드를 찾을 수 없습니다. (%s)", HttpStatus.NOT_FOUND),
    NOT_FOUND_ADMINISTRATION("REGION_003", "해당 행정동 코드를 찾을 수 없습니다. (%s)", HttpStatus.NOT_FOUND),
    NOT_FOUND_COMMERCIAL("REGION_004", "해당 상권 코드를 찾을 수 없습니다. (%s)", HttpStatus.NOT_FOUND),
    COORDINATE_TRANSFORM_FAILED("REGION_005", "좌표 변환에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
