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
    COORDINATE_TRANSFORM_FAILED("REGION_005", "좌표 변환에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    AMBIGUOUS_REGION_NAME("REGION_006", "같은 이름의 지역이 여러 곳 있습니다. (%s) 지역 코드로 조회해 주세요.", HttpStatus.BAD_REQUEST),

    // 요청 검증(Bean Validation) 대역 — 1xx. (coding-conventions.md §8-2)
    // 필드별 코드는 REGION_101~109 를 RegionValidationMessage 상수 클래스에 두고 여기서는 중복 정의하지 않는다.
    // PARAMETER_TYPE_INVALID 는 1xx 대역의 마지막을 차지해 필드별 코드가 늘어날 자리를 비워 둔다.
    INVALID_REQUEST("REGION_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("REGION_110", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
