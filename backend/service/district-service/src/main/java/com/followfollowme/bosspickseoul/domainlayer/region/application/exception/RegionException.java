package com.followfollowme.bosspickseoul.domainlayer.region.application.exception;

import lombok.Getter;

@Getter
public class RegionException extends RuntimeException {

    private final RegionErrorCode errorCode;

    public RegionException(RegionErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public RegionException(RegionErrorCode errorCode, Object... args) {
        super(String.format(errorCode.getMessage(), args));
        this.errorCode = errorCode;
    }

    public RegionException(RegionErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }
}
