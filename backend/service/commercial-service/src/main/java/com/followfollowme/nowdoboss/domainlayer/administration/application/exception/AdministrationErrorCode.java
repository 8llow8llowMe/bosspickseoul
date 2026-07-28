package com.followfollowme.nowdoboss.domainlayer.administration.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdministrationErrorCode {

    INCOME_NOT_FOUND("ADMINISTRATION_001", "행정동 지출 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    SALES_NOT_FOUND("ADMINISTRATION_002", "행정동 매출 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    STORE_NOT_FOUND("ADMINISTRATION_003", "행정동 점포 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
