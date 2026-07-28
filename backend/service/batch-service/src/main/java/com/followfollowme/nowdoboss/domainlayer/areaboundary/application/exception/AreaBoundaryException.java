package com.followfollowme.nowdoboss.domainlayer.areaboundary.application.exception;

import lombok.Getter;

@Getter
public class AreaBoundaryException extends RuntimeException {

    private final AreaBoundaryErrorCode errorCode;

    public AreaBoundaryException(AreaBoundaryErrorCode errorCode, Throwable cause, Object... args) {
        super(String.format(errorCode.getMessage(), args), cause);
        this.errorCode = errorCode;
    }
}
