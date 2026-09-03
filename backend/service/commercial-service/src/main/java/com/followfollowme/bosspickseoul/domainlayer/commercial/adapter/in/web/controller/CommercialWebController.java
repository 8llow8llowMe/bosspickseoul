package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialBenchmarkResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparisonResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialHeatmapScoresResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response.CommercialTrendResponse;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialComparisonQuery;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/commercials")
@Tag(name = "상권 분석", description = "상권 분석, 비교, 벤치마크 조회 API를 제공합니다.")
public class CommercialWebController {

    private final CommercialWebUseCase commercialWebUseCase;

    @Operation(summary = "상권 업종 목록 조회", description = "상권에 해당하는 업종 분류 목록을 조회합니다.")
    @GetMapping("/{commercialCode}/service-categories")
    public ResponseEntity<Response<List<CommercialServiceCategoryResponse>>> getServiceCategoriesByCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode
    ) {
        List<CommercialServiceCategoryResponse> responses = commercialWebUseCase.getServiceCategoriesByCommercialCode(commercialCode);
        return ResponseEntity.ok().body(Response.success(responses));
    }

    @Operation(summary = "상권 유동인구 조회", description = "상권 기준 유동인구 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/foot-traffic")
    public ResponseEntity<Response<CommercialFootTrafficResponse>> getFootTrafficByPeriodCodeAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialFootTrafficResponse response = commercialWebUseCase
            .getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 매출 분석 조회", description = "상권과 업종 기준 매출 분석 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/services/{serviceCode}/sales")
    public ResponseEntity<Response<CommercialSalesResponse>> getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @PathVariable String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialSalesResponse response = commercialWebUseCase
            .getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 시설 조회", description = "상권 주변 주요 시설 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/facilities")
    public ResponseEntity<Response<CommercialFacilityResponse>> getFacilityByPeriodAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialFacilityResponse response = commercialWebUseCase.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 거주인구 조회", description = "상권의 거주인구 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/population")
    public ResponseEntity<Response<CommercialResidentPopulationResponse>> getPopulationByPeriodAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialResidentPopulationResponse response = commercialWebUseCase
            .getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 소득·지출 조회", description = "상권의 소득과 지출 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/income")
    public ResponseEntity<Response<CommercialIncomeAndExpenseResponse>> getIncomeByPeriodCodeAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialIncomeAndExpenseResponse response = commercialWebUseCase
            .getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 점포 분석 조회", description = "상권의 점포 현황과 유사 업종 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/services/{serviceCode}/stores")
    public ResponseEntity<Response<CommercialStoreAnalysisResponse>> getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @PathVariable String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialStoreAnalysisResponse response = commercialWebUseCase.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
            periodCode,
            commercialCode,
            serviceCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 A/B 비교 조회", description = "두 상권의 매출, 유동인구, 점포, 소비력, 거주인구, 시설 정보를 비교합니다.")
    @GetMapping("/compare")
    public ResponseEntity<Response<CommercialComparisonResponse>> compareCommercials(
        @ParameterObject
        @Valid @ModelAttribute CommercialComparisonQuery query
    ) {
        CommercialComparisonResponse response = commercialWebUseCase.compareCommercials(query);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 벤치마크 조회", description = "상권의 매출과 소비력 지표를 자치구 및 행정동 평균과 비교합니다.")
    @GetMapping("/{commercialCode}/benchmarks")
    public ResponseEntity<Response<CommercialBenchmarkResponse>> getBenchmarks(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialBenchmarkResponse response = commercialWebUseCase.getBenchmarks(periodCode, commercialCode, serviceCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Hidden
    @Operation(summary = "상권 히트맵 점수 조회", description = "지도 히트맵에 사용하는 상권 점수를 조회합니다.")
    @GetMapping("/heatmap")
    public ResponseEntity<Response<CommercialHeatmapScoresResponse>> getHeatmapScores(
        @Parameter(description = "상권 코드 목록", required = true) @RequestParam List<String> commercialCodes,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "히트맵 지표 타입", required = true, example = "OPPORTUNITY_SCORE") @RequestParam CommercialHeatmapMetricType metricType,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialHeatmapScoresResponse response = commercialWebUseCase
            .getHeatmapScores(periodCode, serviceCode, commercialCodes, metricType);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Hidden
    @Operation(summary = "후보 상권 랭킹 조회", description = "프리셋 가중치 기반으로 후보 상권 Top N 을 조회합니다.")
    @GetMapping("/candidates")
    public ResponseEntity<Response<CandidateCommercialsResponse>> getTopCandidates(
        @Parameter(description = "상권 코드 목록", required = true) @RequestParam List<String> commercialCodes,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "후보 탐색 프리셋", required = true, example = "BALANCED") @RequestParam CandidatePresetType preset,
        @Parameter(description = "우선 지표 (미지정 시 프리셋 기본값)") @RequestParam(required = false) CommercialHeatmapMetricType priorityMetric,
        @Parameter(description = "상위 N (기본 10, 5~30)", example = "10") @RequestParam(defaultValue = "10") @Min(value = 5, message = CommercialValidationMessage.TOP_N_INVALID)
        @Max(value = 30, message = CommercialValidationMessage.TOP_N_INVALID) int topN,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CandidateCommercialsResponse response = commercialWebUseCase.getTopCandidates(
            periodCode, serviceCode, commercialCodes, preset, priorityMetric, topN
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Hidden
    @Operation(summary = "복합 히트맵 점수 조회", description = "프리셋 가중치 기반 compositeScore 를 히트맵 응답 형태로 반환합니다.")
    @GetMapping("/heatmap-composite")
    public ResponseEntity<Response<CommercialHeatmapScoresResponse>> getCompositeHeatmapScores(
        @Parameter(description = "상권 코드 목록", required = true) @RequestParam List<String> commercialCodes,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "후보 탐색 프리셋", required = true, example = "BALANCED") @RequestParam CandidatePresetType preset,
        @Parameter(description = "우선 지표 (미지정 시 프리셋 기본값)") @RequestParam(required = false) CommercialHeatmapMetricType priorityMetric,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialHeatmapScoresResponse response = commercialWebUseCase.getCompositeHeatmapScores(
            periodCode,
            serviceCode,
            commercialCodes,
            preset,
            priorityMetric
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    // FE 가 분석 결과/지도/AI 리포트 화면에서 직접 사용하는 공개 계약이라 @Hidden 을 해제했다
    // (숨겨져 있는 동안 OpenAPI 스냅샷 대조가 안 되어 policyRecommendations 누락 등 계약 표류가 발생했다).
    @Operation(summary = "상권 프로필 조회",
        description = "상권 종합 프로필(집계 지표 + 자치구·행정동 메타 + 지원 정책 추천 상위 5건)을 조회합니다.")
    @GetMapping("/{commercialCode}/profile")
    public ResponseEntity<Response<CommercialProfileResponse>> getCommercialProfile(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialProfileResponse response = commercialWebUseCase.getCommercialProfile(periodCode, commercialCode, serviceCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Hidden
    @Operation(summary = "상권 비교 프리뷰 조회", description = "두 상권의 경량 비교 정보를 반환합니다.")
    @GetMapping("/compare-preview")
    public ResponseEntity<Response<CommercialComparePreviewResponse>> getCommercialComparePreview(
        @ParameterObject
        @Valid @ModelAttribute CommercialComparisonQuery query
    ) {
        CommercialComparePreviewResponse response = commercialWebUseCase.getCommercialComparePreview(query);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 매출 요약 비교 조회", description = "상권과 주변 지역의 매출 수준을 비교합니다.")
    @GetMapping("/{commercialCode}/summaries/sales")
    public ResponseEntity<Response<CommercialSalesSummaryResponse>> getSalesSummary(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "자치구 코드", required = true, example = "11110") @RequestParam String districtCode,
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @RequestParam String administrationCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialSalesSummaryResponse response = commercialWebUseCase.getSalesSummary(
            periodCode,
            districtCode,
            administrationCode,
            commercialCode,
            serviceCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 트렌드 분석 조회", description = "상권의 매출·유동인구·점포 지표의 분기별 추이를 조회합니다.")
    @GetMapping("/{commercialCode}/trend")
    public ResponseEntity<Response<CommercialTrendResponse>> getTrend(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "조회 지표 타입", required = true, example = "SALES") @RequestParam CommercialTrendMetricType metricType,
        @Parameter(description = "기준 분기 코드 (최신 분기)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode,
        @Parameter(description = "조회 분기 수 (1~8, 기본 4)") @RequestParam(defaultValue = "4") int periodCount
    ) {
        CommercialTrendResponse response = commercialWebUseCase.getTrend(
            periodCode, commercialCode, serviceCode, metricType, periodCount);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 지출 요약 비교 조회", description = "상권과 주변 지역의 지출 수준을 비교합니다.")
    @GetMapping("/{commercialCode}/summaries/income")
    public ResponseEntity<Response<CommercialIncomeSummaryResponse>> getIncomeSummary(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "자치구 코드", required = true, example = "11110") @RequestParam String districtCode,
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @RequestParam String administrationCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialIncomeSummaryResponse response = commercialWebUseCase.getIncomeSummary(
            periodCode,
            districtCode,
            administrationCode,
            commercialCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "업종별 상권 추천",
        description = "업종 코드(serviceCode)를 기반으로 프리셋을 자동 선택해 적합한 상권 Top N을 추천합니다. "
            + "음식업(CS1*)→공격형, 서비스업(CS2*)→안정형, 기타→균형형 프리셋을 적용합니다."
    )
    @GetMapping("/recommendations/by-service")
    public ResponseEntity<Response<CandidateCommercialsResponse>> getRecommendationsByService(
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "상권 코드 목록", required = true) @RequestParam List<String> commercialCodes,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode,
        @Parameter(description = "상위 N (기본 5, 5~30)", example = "5") @RequestParam(defaultValue = "5") @Min(value = 5, message = CommercialValidationMessage.TOP_N_INVALID)
        @Max(value = 30, message = CommercialValidationMessage.TOP_N_INVALID) int topN
    ) {
        CandidateCommercialsResponse response = commercialWebUseCase.getRecommendationsByService(
            periodCode, serviceCode, commercialCodes, topN);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
