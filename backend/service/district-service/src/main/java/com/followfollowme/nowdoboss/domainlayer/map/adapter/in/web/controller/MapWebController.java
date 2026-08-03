package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.application.exception.MapValidationMessage;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.in.MapWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/map")
@Tag(name = "지도 영역", description = "지도에 표시할 영역 좌표와 상권 히트맵을 제공하는 API입니다.")
public class MapWebController {

    private final MapWebUseCase mapWebUseCase;

    @Operation(summary = "상권 영역 좌표 조회", description = "지도 뷰포트 범위 안에 포함된 상권 영역 좌표 목록을 조회합니다.")
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

    @Operation(summary = "행정동 영역 좌표 조회", description = "지도 뷰포트 범위 안에 포함된 행정동 영역 좌표 목록을 조회합니다.")
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

    @Operation(summary = "자치구 영역 좌표 조회", description = "지도 뷰포트 범위 안에 포함된 자치구 영역 좌표 목록을 조회합니다.")
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

    @Operation(
        summary = "상권 히트맵 조회",
        description = "지도에 표시할 상권 히트맵을 조회합니다."
            + " composite=false 이면 metricType 으로 단일 지표,"
            + " composite=true 이면 preset 기반 복합 점수를 반환합니다."
            + " 해당 모드에 필요한 파라미터가 누락되면 400 을 반환합니다."
    )
    @GetMapping("/commercials/heatmap")
    public ResponseEntity<Response<CommercialHeatmapResponse>> getCommercialHeatmap(
        @Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW,
        @Parameter(description = "남서쪽 위도", required = true, example = "37.45") @RequestParam double latSW,
        @Parameter(description = "북동쪽 경도", required = true, example = "127.10") @RequestParam double lngNE,
        @Parameter(description = "북동쪽 위도", required = true, example = "37.70") @RequestParam double latNE,
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode,
        @Parameter(description = "지표 타입 (composite=false 일 때 필수)", example = "OPPORTUNITY_SCORE") @RequestParam(required = false) CommercialHeatmapMetricType metricType,
        @Parameter(description = "후보 프리셋 (composite=true 일 때 필수)", example = "BALANCED") @RequestParam(required = false) CandidatePresetType preset,
        @Parameter(description = "우선 지표 (composite=true 일 때 선택, 미지정 시 프리셋 기본값)") @RequestParam(required = false) CommercialHeatmapMetricType priorityMetric,
        @Parameter(description = "복합 점수 모드 여부", example = "false") @RequestParam(required = false, defaultValue = "false") boolean composite
    ) {
        CommercialHeatmapResponse response = mapWebUseCase.getCommercialHeatmap(
            lngSW, latSW, lngNE, latNE, serviceCode, periodCode, metricType, preset, priorityMetric, composite
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "후보 탐색 프리셋 조회", description = "후보 상권 탐색에 사용할 프리셋 목록을 조회합니다.")
    @GetMapping("/candidate-presets")
    public ResponseEntity<Response<CandidatePresetsResponse>> getCandidatePresets() {
        CandidatePresetsResponse response = mapWebUseCase.getCandidatePresets();
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "후보 상권 랭킹 조회",
        description = "프리셋 가중치와 우선 지표 기준으로 지도 범위 내 후보 상권 Top N 을 조회합니다."
    )
    @GetMapping("/commercials/candidates")
    public ResponseEntity<Response<CandidateCommercialsResponse>> getCandidateCommercials(
        @Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW,
        @Parameter(description = "남서쪽 위도", required = true, example = "37.45") @RequestParam double latSW,
        @Parameter(description = "북동쪽 경도", required = true, example = "127.10") @RequestParam double lngNE,
        @Parameter(description = "북동쪽 위도", required = true, example = "37.70") @RequestParam double latNE,
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "후보 탐색 프리셋", required = true, example = "BALANCED") @RequestParam CandidatePresetType preset,
        @Parameter(description = "우선 지표 (미지정 시 프리셋 기본값)") @RequestParam(required = false) CommercialHeatmapMetricType priorityMetric,
        @Parameter(description = "상위 N (기본 10, 5~30)", example = "10") @RequestParam(required = false)
        @Min(value = 5, message = MapValidationMessage.TOP_N_TOO_SMALL)
        @Max(value = 30, message = MapValidationMessage.TOP_N_TOO_LARGE)
        Integer topN,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CandidateCommercialsResponse response = mapWebUseCase.getCandidateCommercials(
            lngSW, latSW, lngNE, latNE, serviceCode, periodCode, preset, priorityMetric, topN
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 프로필 조회", description = "지도에서 선택한 상권의 프로필 카드 정보를 조회합니다.")
    @GetMapping("/commercials/{commercialCode}/profile")
    public ResponseEntity<Response<CommercialProfileResponse>> getCommercialProfile(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialProfileResponse response = mapWebUseCase.getCommercialProfile(commercialCode, serviceCode, periodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "상권 비교 프리뷰 조회",
        description = "두 상권의 경량 비교 정보(종합 요약 + 핵심 지표 + 추천 측)를 반환합니다."
    )
    @GetMapping("/commercials/compare-preview")
    public ResponseEntity<Response<CommercialComparePreviewResponse>> getCommercialComparePreview(
        @Parameter(description = "좌측 상권 코드", required = true, example = "3110008") @RequestParam String leftCommercialCode,
        @Parameter(description = "우측 상권 코드", required = true, example = "3110012") @RequestParam String rightCommercialCode,
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialComparePreviewResponse response = mapWebUseCase.getCommercialComparePreview(
            leftCommercialCode, rightCommercialCode, serviceCode, periodCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }
}
