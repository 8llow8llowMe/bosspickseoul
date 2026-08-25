package com.followfollowme.bosspickseoul.domainlayer.policy.application.exception;

import lombok.Getter;

@Getter
public class PolicyException extends RuntimeException {

    private final PolicyErrorCode errorCode;

    public PolicyException(PolicyErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public PolicyException(PolicyErrorCode errorCode, Object... args) {
        super(errorCode.getMessage().formatted(args));
        this.errorCode = errorCode;
    }
}
