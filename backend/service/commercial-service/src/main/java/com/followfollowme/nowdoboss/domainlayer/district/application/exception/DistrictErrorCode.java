package com.followfollowme.nowdoboss.domainlayer.district.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DistrictErrorCode {

    CHANGE_INDICATOR_NOT_FOUND("DISTRICT_001", "해당 분기의 상권 변화 지표 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    FOOT_TRAFFIC_NOT_FOUND("DISTRICT_002", "해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    PERIOD_CODE_INVALID("DISTRICT_003", "분기 코드는 YYYYQ 형식이어야 합니다. (%s)", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
