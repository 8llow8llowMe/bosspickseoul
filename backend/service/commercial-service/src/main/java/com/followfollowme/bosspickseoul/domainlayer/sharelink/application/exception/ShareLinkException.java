package com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception;

import lombok.Getter;

@Getter
public class ShareLinkException extends RuntimeException {

    private final ShareLinkErrorCode errorCode;

    public ShareLinkException(ShareLinkErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
