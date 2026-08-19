package com.followfollowme.nowdoboss.domainlayer.administration.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdministrationErrorCode {

    INCOME_NOT_FOUND("ADMINISTRATION_001", "해당 분기의 행정동 지출 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    SALES_NOT_FOUND("ADMINISTRATION_002", "해당 분기의 행정동 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    STORE_NOT_FOUND("ADMINISTRATION_003", "해당 분기의 행정동 점포 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
