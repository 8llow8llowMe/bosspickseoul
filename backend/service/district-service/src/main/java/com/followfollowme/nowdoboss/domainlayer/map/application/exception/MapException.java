package com.followfollowme.nowdoboss.domainlayer.map.application.exception;

import lombok.Getter;

@Getter
public class MapException extends RuntimeException {

    private final MapErrorCode errorCode;

    public MapException(MapErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
