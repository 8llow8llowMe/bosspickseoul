package com.followfollowme.nowdoboss.domainlayer.commercialsummary.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommercialSummaryErrorCode {

    SALES_NOT_FOUND("COMMERCIAL_SUMMARY_001", "해당 분기의 %s 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    INCOME_NOT_FOUND("COMMERCIAL_SUMMARY_002", "해당 분기의 %s 지출 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
