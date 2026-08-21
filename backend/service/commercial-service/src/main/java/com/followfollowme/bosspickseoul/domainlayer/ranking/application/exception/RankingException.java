package com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception;

import lombok.Getter;

@Getter
public class RankingException extends RuntimeException {

    private final RankingErrorCode errorCode;

    public RankingException(RankingErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public RankingException(RankingErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }
}
