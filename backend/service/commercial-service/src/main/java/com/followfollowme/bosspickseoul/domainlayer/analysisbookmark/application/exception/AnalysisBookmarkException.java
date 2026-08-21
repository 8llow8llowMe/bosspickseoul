package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception;

import lombok.Getter;

@Getter
public class AnalysisBookmarkException extends RuntimeException {

    private final AnalysisBookmarkErrorCode errorCode;

    public AnalysisBookmarkException(AnalysisBookmarkErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
