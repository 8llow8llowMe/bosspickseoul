package com.followfollowme.bosspickseoul.domainlayer.map.application.exception;

import lombok.Getter;

@Getter
public class MapException extends RuntimeException {

    private final MapErrorCode errorCode;

    public MapException(MapErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public MapException(MapErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }

    /** 하위 서비스 응답 메시지를 그대로 노출해야 할 때 사용한다 (예: 분기별 데이터 부재 404 전달). */
    public MapException(MapErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
