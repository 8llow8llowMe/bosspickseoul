package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialFootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialIncomeSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialSalesSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialStoreAnalysisResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.in.CommercialWebUseCase;
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
@Tag(name = "상권 분석", description = "상권 분석 관련 클라이언트 전용 API")
public class CommercialWebController {

    private final CommercialWebUseCase commercialWebUseCase;

    @Operation(summary = "상권 내 업종 목록 조회", description = "선택한 상권에 실제 존재하는 서비스 업종 목록을 조회합니다.")
    @GetMapping("/{commercialCode}/service-categories")
    public ResponseEntity<Response<List<CommercialServiceCategoryResponse>>> getServiceCategoriesByCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode
    ) {
        List<CommercialServiceCategoryResponse> responses = commercialWebUseCase.getServiceCategoriesByCommercialCode(commercialCode);
        return ResponseEntity.ok().body(Response.success(responses));
    }

    @Operation(summary = "상권 분기별 유동 인구 조회", description = "주어진 상권 코드의 해당 분기 유동 인구 데이터를 조회합니다.")
    @GetMapping("/{commercialCode}/foot-traffic")
    public ResponseEntity<Response<CommercialFootTrafficResponse>> getFootTrafficByPeriodCodeAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialFootTrafficResponse response = commercialWebUseCase.getFootTrafficByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권/업종 분기별 매출 분석 조회", description = "주어진 상권 코드 및 서비스 코드의 분기 매출 분석 데이터를 조회합니다.")
    @GetMapping("/{commercialCode}/services/{serviceCode}/sales")
    public ResponseEntity<Response<CommercialSalesResponse>> getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @PathVariable String serviceCode,
        @Parameter(description = "기준 분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialSalesResponse response = commercialWebUseCase.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 분기별 집객 시설 조회", description = "주어진 상권 코드의 해당 분기 집객 시설 데이터를 조회합니다.")
    @GetMapping("/{commercialCode}/facilities")
    public ResponseEntity<Response<CommercialFacilityResponse>> getFacilityByPeriodAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialFacilityResponse response = commercialWebUseCase.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 분기별 상주 인구 조회", description = "주어진 상권 코드의 해당 분기 상주 인구 데이터를 조회합니다.")
    @GetMapping("/{commercialCode}/population")
    public ResponseEntity<Response<CommercialResidentPopulationResponse>> getPopulationByPeriodAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialResidentPopulationResponse response = commercialWebUseCase.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 분기별 지출 내역 분석 조회", description = "주어진 상권 코드의 해당 분기 지출 내역 분석 데이터를 조회합니다.")
    @GetMapping("/{commercialCode}/income")
    public ResponseEntity<Response<CommercialIncomeAndExpenseResponse>> getIncomeByPeriodCodeAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialIncomeAndExpenseResponse response = commercialWebUseCase.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권/업종 점포 분석 조회", description = "주어진 상권 코드 및 서비스 코드의 분기 점포 분석 데이터를 조회합니다.")
    @GetMapping("/{commercialCode}/services/{serviceCode}/stores")
    public ResponseEntity<Response<CommercialStoreAnalysisResponse>> getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @PathVariable String serviceCode,
        @Parameter(description = "기준 분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialStoreAnalysisResponse response = commercialWebUseCase.getStoreByPeriodCodeAndCommercialCodeAndServiceCode(
            periodCode, commercialCode, serviceCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구/행정동/상권 매출 총액 비교 조회", description = "주어진 자치구, 행정동, 상권, 서비스에 대한 분기 매출 요약을 조회합니다.")
    @GetMapping("/{commercialCode}/summaries/sales")
    public ResponseEntity<Response<CommercialSalesSummaryResponse>> getSalesSummary(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "자치구 코드", required = true, example = "11110") @RequestParam String districtCode,
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @RequestParam String administrationCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드(YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialSalesSummaryResponse response = commercialWebUseCase.getSalesSummary(
            periodCode, districtCode, administrationCode, commercialCode, serviceCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구/행정동/상권 지출 총액 비교 조회", description = "주어진 자치구, 행정동, 상권에 대한 분기 지출 요약을 조회합니다.")
    @GetMapping("/{commercialCode}/summaries/income")
    public ResponseEntity<Response<CommercialIncomeSummaryResponse>> getIncomeSummary(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "자치구 코드", required = true, example = "11110") @RequestParam String districtCode,
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @RequestParam String administrationCode,
        @Parameter(description = "기준 분기 코드(YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialIncomeSummaryResponse response = commercialWebUseCase.getIncomeSummary(
            periodCode, districtCode, administrationCode, commercialCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }
}