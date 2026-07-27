package com.followfollowme.nowdoboss.domainlayer.map.application.exception;

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
    AREA_BOUNDARY_PARSE_FAILED("MAP_007", "영역 경계 좌표 변환에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
