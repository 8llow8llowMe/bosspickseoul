package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ai-reports")
@Tag(name = "AI 리포트", description = "상권 및 자치구 분석 데이터를 자연어 리포트로 요약하는 API입니다.")
public class AiReportWebController {

    private final AiReportWebUseCase aiReportWebUseCase;

    @Operation(summary = "상권 AI 리포트 조회", description = "상권과 업종 분석 데이터를 기반으로 AI 요약 리포트를 조회합니다.")
    @GetMapping("/commercials/{commercialCode}")
    public ResponseEntity<Response<CommercialAiReportResponse>> getCommercialReport(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialAiReportResponse response = aiReportWebUseCase.getCommercialReport(commercialCode, serviceCode, periodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 AI 리포트 조회", description = "자치구 분석 데이터를 기반으로 AI 요약 리포트를 조회합니다.")
    @GetMapping("/districts/{districtCode}")
    public ResponseEntity<Response<DistrictAiReportResponse>> getDistrictReport(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        DistrictAiReportResponse response = aiReportWebUseCase.getDistrictReport(districtCode, periodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
