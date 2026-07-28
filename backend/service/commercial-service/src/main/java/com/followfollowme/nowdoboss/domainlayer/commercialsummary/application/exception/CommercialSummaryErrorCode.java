package com.followfollowme.nowdoboss.domainlayer.commercialsummary.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommercialSummaryErrorCode {

    SALES_NOT_FOUND("COMMERCIAL_SUMMARY_001", "%s 매출 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    INCOME_NOT_FOUND("COMMERCIAL_SUMMARY_002", "%s 지출 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
