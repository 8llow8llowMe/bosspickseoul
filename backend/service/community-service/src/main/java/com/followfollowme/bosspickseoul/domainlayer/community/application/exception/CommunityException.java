package com.followfollowme.bosspickseoul.domainlayer.community.application.exception;

import lombok.Getter;

@Getter
public class CommunityException extends RuntimeException {

    private final CommunityErrorCode errorCode;

    public CommunityException(CommunityErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
