package com.followfollowme.bosspickseoul.domainlayer.administration.application.exception;

import lombok.Getter;

@Getter
public class AdministrationException extends RuntimeException {

    private final AdministrationErrorCode errorCode;

    public AdministrationException(AdministrationErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
