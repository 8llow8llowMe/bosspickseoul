package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.in.MapWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/map")
@Tag(name = "지도 영역", description = "지도에 표시할 폴리곤과 상권 히트맵을 제공하는 API를 제공합니다.")
public class MapWebController {

    private final MapWebUseCase mapWebUseCase;

    @Operation(summary = "상권 폴리곤 조회", description = "지도 범위 안에 포함된 상권 폴리곤을 조회합니다.")
    @GetMapping("/commercials")
    public ResponseEntity<Response<MapAreaCoordsResponse>> getCommercialAreaCoords(
        @Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW,
        @Parameter(description = "남서쪽 위도", required = true, example = "37.45") @RequestParam double latSW,
        @Parameter(description = "북동쪽 경도", required = true, example = "127.10") @RequestParam double lngNE,
        @Parameter(description = "북동쪽 위도", required = true, example = "37.70") @RequestParam double latNE
    ) {
        MapAreaCoordsResponse response = mapWebUseCase.getCommercialAreaCoords(lngSW, latSW, lngNE, latNE);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "행정동 폴리곤 조회", description = "지도 범위 안에 포함된 행정동 폴리곤을 조회합니다.")
    @GetMapping("/administrations")
    public ResponseEntity<Response<MapAreaCoordsResponse>> getAdministrationAreaCoords(
        @Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW,
        @Parameter(description = "남서쪽 위도", required = true, example = "37.45") @RequestParam double latSW,
        @Parameter(description = "북동쪽 경도", required = true, example = "127.10") @RequestParam double lngNE,
        @Parameter(description = "북동쪽 위도", required = true, example = "37.70") @RequestParam double latNE
    ) {
        MapAreaCoordsResponse response = mapWebUseCase.getAdministrationAreaCoords(lngSW, latSW, lngNE, latNE);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 폴리곤 조회", description = "지도 범위 안에 포함된 자치구 폴리곤을 조회합니다.")
    @GetMapping("/districts")
    public ResponseEntity<Response<MapAreaCoordsResponse>> getDistrictAreaCoords(
        @Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW,
        @Parameter(description = "남서쪽 위도", required = true, example = "37.45") @RequestParam double latSW,
        @Parameter(description = "북동쪽 경도", required = true, example = "127.10") @RequestParam double lngNE,
        @Parameter(description = "북동쪽 위도", required = true, example = "37.70") @RequestParam double latNE
    ) {
        MapAreaCoordsResponse response = mapWebUseCase.getDistrictAreaCoords(lngSW, latSW, lngNE, latNE);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 히트맵 조회", description = "지도에 표시할 상권 히트맵을 조회합니다.")
    @GetMapping("/commercials/heatmap")
    public ResponseEntity<Response<CommercialHeatmapResponse>> getCommercialHeatmap(
        @Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW,
        @Parameter(description = "남서쪽 위도", required = true, example = "37.45") @RequestParam double latSW,
        @Parameter(description = "북동쪽 경도", required = true, example = "127.10") @RequestParam double lngNE,
        @Parameter(description = "북동쪽 위도", required = true, example = "37.70") @RequestParam double latNE,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode,
        @Parameter(description = "지표 타입", required = true, example = "OPPORTUNITY_SCORE") @RequestParam CommercialHeatmapMetricType metricType
    ) {
        CommercialHeatmapResponse response = mapWebUseCase.getCommercialHeatmap(lngSW, latSW, lngNE, latNE, serviceCode, periodCode, metricType);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
