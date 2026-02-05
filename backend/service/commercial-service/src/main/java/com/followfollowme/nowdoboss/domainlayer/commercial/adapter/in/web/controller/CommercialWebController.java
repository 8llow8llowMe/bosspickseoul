package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FacilityResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.FootTrafficResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.IncomeAndExpenseResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ResidentPopulationResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.SalesResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.ServiceCategoryResponse;
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
@Tag(name = "상권", description = "상권 분석 관련 클라이언트 전용 API 입니다.")
public class CommercialWebController {

    private final CommercialWebUseCase commercialWebUseCase;

    @Operation(
        summary = "상권에 존재하는 업종 목록 조회",
        description = "선택한 상권에 실제 존재하는 서비스 업종 목록을 조회하는 기능입니다."
    )
    @GetMapping("/{commercialCode}/service-categories")
    public ResponseEntity<Response<List<ServiceCategoryResponse>>> getServiceCategories(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode
    ) {
        List<ServiceCategoryResponse> responses = commercialWebUseCase.getServiceCategoriesByCommercialCode(commercialCode);
        return ResponseEntity.ok().body(Response.success(responses));
    }

    @Operation(
        summary = "해당 상권의 분기별 유동 인구 조회",
        description = "주어진 상권 코드에 대해 해당 분기의 유동 인구 데이터를 조회합니다. 기준 년분기 코드가 주어지지 않으면 2023년 3분기의 데이터를 사용합니다."
    )
    @GetMapping("/{commercialCode}/foot-traffic")
    public ResponseEntity<Response<FootTrafficResponse>> getFootTrafficByCommercialCodeAndPeriod(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 년분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        FootTrafficResponse response = commercialWebUseCase.getFootTrafficByPeriodCodeAndCommercialCode(
            periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "해당 상권&업종의 분기별 매출 분석 조회",
        description = "주어진 상권 코드 및 서비스 코드에 대해 해당 분기의 매출분석 데이터를 조회합니다. 기준 년분기 코드가 주어지지 않으면 2023년 3분기의 데이터를 사용합니다."
    )
    @GetMapping("/{commercialCode}/{serviceCode}/sales")
    public ResponseEntity<Response<SalesResponse>> getSalesByPeriodCodeAndCommercialCodeAndServiceCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @PathVariable String serviceCode,
        @Parameter(description = "기준 년분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        SalesResponse response = commercialWebUseCase.getSalesByPeriodCodeAndCommercialCodeAndServiceCode(periodCode, commercialCode, serviceCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "해당 상권의 분기별 집객 시설 조회",
        description = "주어진 상권코드에 대해 해당 분기의 집객 시설 데이터를 조회합니다. 기준년분기코드가 주어지지 않으면 2023년 3분기의 데이터를 사용합니다."
    )
    @GetMapping("/{commercialCode}}/facility")
    public ResponseEntity<Response<FacilityResponse>> getFacilityByPeriodAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 년분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        FacilityResponse response = commercialWebUseCase.getFacilityByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "해당 상권의 분기별 상주 인구 조회",
        description = "주어진 상권코드에 대해 해당 분기의 상주 인구 데이터를 조회합니다. 기준년분기코드가 주어지지 않으면 2023년 3분기의 데이터를 사용합니다."
    )
    @GetMapping("/{commercialCode}/population")
    public ResponseEntity<Response<ResidentPopulationResponse>> getPopulationByPeriodAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 년분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        ResidentPopulationResponse response = commercialWebUseCase.getPopulationByPeriodAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "해당 상권의 분기별 지출 내역 분석 조회",
        description = "주어진 상권코드에 대해 해당 분기의 지출 내역 분석 데이터를 조회합니다. 기준년분기코드가 주어지지 않으면 2023년 3분기의 데이터를 사용합니다."
    )
    @GetMapping("/income/{commercialCode}")
    public ResponseEntity<Response<IncomeAndExpenseResponse>> getIncomeByPeriodCodeAndCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "기준 년분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        IncomeAndExpenseResponse response = commercialWebUseCase.getIncomeByPeriodCodeAndCommercialCode(periodCode, commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
