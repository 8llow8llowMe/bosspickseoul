package com.followfollowme.nowdoboss.domainlayer.commercialsummary.application.exception;

import lombok.Getter;

@Getter
public class CommercialSummaryException extends RuntimeException {

    private final CommercialSummaryErrorCode errorCode;

    public CommercialSummaryException(CommercialSummaryErrorCode errorCode, Object... args) {
        super(String.format(errorCode.getMessage(), args));
        this.errorCode = errorCode;
    }
}
