package com.followfollowme.bosspickseoul.domainlayer.map.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum MapErrorCode {

    INVALID_TOP_N("MAP_001", "topN은 5 이상 30 이하여야 합니다.", HttpStatus.BAD_REQUEST),
    HEATMAP_PRESET_REQUIRED("MAP_002", "composite=true 인 경우 preset 은 필수입니다.", HttpStatus.BAD_REQUEST),
    HEATMAP_METRIC_TYPE_REQUIRED("MAP_003", "composite=false 인 경우 metricType 은 필수입니다.", HttpStatus.BAD_REQUEST),
    HEATMAP_METRIC_TYPE_NOT_ALLOWED("MAP_004", "composite=true 인 경우 metricType 은 사용할 수 없습니다.", HttpStatus.BAD_REQUEST),
    HEATMAP_PRESET_NOT_ALLOWED("MAP_005", "composite=false 인 경우 preset 또는 priorityMetric 은 사용할 수 없습니다.", HttpStatus.BAD_REQUEST),
    VIEWPORT_INVALID("MAP_006", "지도 뷰포트 좌표가 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    AREA_BOUNDARY_PARSE_FAILED("MAP_007", "영역 경계 좌표 변환에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    INTERNAL_SERVICE_UNAVAILABLE("MAP_008", "상권 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.", HttpStatus.SERVICE_UNAVAILABLE),
    // 하위 서비스(commercial)의 404 는 장애가 아니라 "데이터 없음" — 하위 응답의 resultMessage 를 그대로 전달한다.
    UPSTREAM_DATA_NOT_FOUND("MAP_009", "요청한 상권 분석 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    // 뷰포트가 넓어 영역이 상한을 넘은 경우. 몇 건이 넘쳤는지는 메시지에 담지 않는다.
    // MapException 에 varargs 생성자를 두면 기존 MapException(errorCode, String message) 와 모호해진다.
    VIEWPORT_TOO_MANY_AREAS("MAP_010", "지도 범위에 포함된 영역이 너무 많습니다. 지도를 확대해 주세요.", HttpStatus.BAD_REQUEST),

    // 요청 검증(Bean Validation) 대역 — 1xx.
    // 필드별 코드(MAP_101~102)는 MapValidationMessage 가 단일 기준점이며, 여기서는 중복 정의하지 않는다.
    INVALID_REQUEST("MAP_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("MAP_103", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
