package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.in.DistrictWebUseCase;
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
@RequestMapping("/api/v1/districts")
@Tag(name = "자치구", description = "자치구 분석 관련 클라이언트 전용 API 입니다.")
public class DistrictWebController {

    private final DistrictWebUseCase districtWebUseCase;

    @Operation(
        summary = "자치구별 Top 10 요약 정보 조회",
        description = "유동인구, 매출, 개업 점포, 폐업 점포 기준 Top 10 자치구 정보를 조회합니다. " +
            "기준 년분기 코드가 주어지지 않으면 2023년 3분기의 데이터를 사용합니다."
    )
    @GetMapping("/top-ten")
    public ResponseEntity<Response<DistrictTopTenSummaryResponse>> getTopTenDistricts(
        @Parameter(description = "현재 기준 년분기 코드 (YYYYQ 형식)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 년분기 코드 (YYYYQ 형식)", example = "20232") @RequestParam(defaultValue = "20232") String previousPeriodCode
    ) {
        DistrictTopTenSummaryResponse response = districtWebUseCase.getTopTenDistricts(currentPeriodCode, previousPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
