package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception;

import lombok.Getter;

@Getter
public class AnalysisPeriodException extends RuntimeException {

    private final AnalysisPeriodErrorCode errorCode;

    public AnalysisPeriodException(AnalysisPeriodErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
