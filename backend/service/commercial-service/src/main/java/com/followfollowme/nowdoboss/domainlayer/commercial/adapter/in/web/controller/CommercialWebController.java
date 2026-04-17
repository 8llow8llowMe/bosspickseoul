package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialBenchmarkResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialComparisonResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialHeatmapScoresResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in.CommercialWebUseCase;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
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
        CommercialFootTrafficResponse response = commercialWebUseCase.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 매출 분석 조회", description = "상권과 업종 기준 매출 분석 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/services/{serviceCode}/sales")
    public ResponseEntity<Response<CommercialSalesResponse>> getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @PathVariable String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialSalesResponse response = commercialWebUseCase.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
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
        CommercialResidentPopulationResponse response = commercialWebUseCase.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 소득·지출 조회", description = "상권의 소득과 지출 정보를 조회합니다.")
    @GetMapping("/{commercialCode}/income")
    public ResponseEntity<Response<CommercialIncomeAndExpenseResponse>> getIncomeByPeriodCodeAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialIncomeAndExpenseResponse response = commercialWebUseCase.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
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
        @Parameter(description = "좌측 상권 코드", required = true, example = "3110008") @RequestParam String leftCommercialCode,
        @Parameter(description = "우측 상권 코드", required = true, example = "3110012") @RequestParam String rightCommercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialComparisonResponse response = commercialWebUseCase.compareCommercials(periodCode, leftCommercialCode, rightCommercialCode, serviceCode);
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
    @Operation(summary = "상권 히트맵 점수 조회", description = "지도 히트맵에 사용되는 상권 점수를 조회합니다.")
    @GetMapping("/heatmap")
    public ResponseEntity<Response<CommercialHeatmapScoresResponse>> getHeatmapScores(
        @Parameter(description = "상권 코드 목록", required = true) @RequestParam List<String> commercialCodes,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "히트맵 지표 타입", required = true, example = "OPPORTUNITY_SCORE") @RequestParam CommercialHeatmapMetricType metricType,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialHeatmapScoresResponse response = commercialWebUseCase.getHeatmapScores(periodCode, serviceCode, commercialCodes, metricType);
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
}
