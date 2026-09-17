package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommercialSummaryErrorCode {

    // 지출 요약은 없는 지역 단위를 null 로 강등하고 404 를 던지지 않으므로 전용 코드가 없다 (이슈 #413).
    SALES_NOT_FOUND("COMMERCIAL_SUMMARY_001", "해당 분기의 %s 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
