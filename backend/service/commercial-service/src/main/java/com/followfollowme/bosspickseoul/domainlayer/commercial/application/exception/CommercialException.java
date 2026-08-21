package com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception;

import lombok.Getter;

@Getter
public class CommercialException extends RuntimeException {

    private final CommercialErrorCode errorCode;

    public CommercialException(CommercialErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public CommercialException(CommercialErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }
}
