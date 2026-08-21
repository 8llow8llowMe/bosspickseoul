package com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception;

import lombok.Getter;

@Getter
public class CommercialSummaryException extends RuntimeException {

    private final CommercialSummaryErrorCode errorCode;

    public CommercialSummaryException(CommercialSummaryErrorCode errorCode, Object... args) {
        super(String.format(errorCode.getMessage(), args));
        this.errorCode = errorCode;
    }
}
