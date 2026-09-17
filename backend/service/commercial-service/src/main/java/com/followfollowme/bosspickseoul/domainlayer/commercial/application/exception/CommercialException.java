package com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

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

    /**
     * 「해당 분기에 데이터 없음」인가. 부분 강등 경로가 404 만 흡수하고 503·400 은 전파하도록
     * 판정을 에러코드의 HTTP 상태로 내린다 — 코드 상수를 나열하면 새 404 를 추가할 때 빠진다.
     */
    public boolean isNotFound() {
        return errorCode.getHttpStatus() == HttpStatus.NOT_FOUND;
    }
}
