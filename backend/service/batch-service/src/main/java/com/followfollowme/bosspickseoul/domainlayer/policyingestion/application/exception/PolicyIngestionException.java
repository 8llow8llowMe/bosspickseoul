package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.exception;

import lombok.Getter;

@Getter
public class PolicyIngestionException extends RuntimeException {

    private final PolicyIngestionErrorCode errorCode;

    public PolicyIngestionException(PolicyIngestionErrorCode errorCode, Object... args) {
        super(format(errorCode, args));
        this.errorCode = errorCode;
    }

    public PolicyIngestionException(PolicyIngestionErrorCode errorCode, Throwable cause, Object... args) {
        super(format(errorCode, args), cause);
        this.errorCode = errorCode;
    }

    private static String format(PolicyIngestionErrorCode errorCode, Object... args) {
        if (args == null || args.length == 0) {
            return errorCode.getMessage();
        }
        return String.format(errorCode.getMessage(), args);
    }
}
