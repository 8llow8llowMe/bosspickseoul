package com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DatasetErrorCode {

    PAYLOAD_FIELD_INVALID("DATASET_001", "적재된 분기 데이터의 형식이 올바르지 않습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    READ_PATH_UNAVAILABLE("DATASET_002", "분기 데이터 저장소를 사용할 수 없습니다.", HttpStatus.SERVICE_UNAVAILABLE);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
