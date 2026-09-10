package com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DatasetErrorCode {

    // 요청 입력이 없는 컨텍스트라 검증 대역(1xx)이 없다. 저장소 장애는 레거시 경로와 같이 DataAccessException 으로 흘러 500 이다.
    PAYLOAD_FIELD_INVALID("DATASET_001", "적재된 분기 데이터의 형식이 올바르지 않습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
