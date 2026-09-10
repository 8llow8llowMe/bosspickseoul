package com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception;

import lombok.Getter;

@Getter
public class DatasetException extends RuntimeException {

    private final DatasetErrorCode errorCode;

    public DatasetException(DatasetErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
