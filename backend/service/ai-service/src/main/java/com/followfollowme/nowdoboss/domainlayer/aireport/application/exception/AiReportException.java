package com.followfollowme.nowdoboss.domainlayer.aireport.application.exception;

import lombok.Getter;

@Getter
public class AiReportException extends RuntimeException {

    private final AiReportErrorCode errorCode;

    public AiReportException(AiReportErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public AiReportException(AiReportErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }

    public AiReportException(AiReportErrorCode errorCode, Object... args) {
        super(String.format(errorCode.getMessage(), args));
        this.errorCode = errorCode;
    }
}
