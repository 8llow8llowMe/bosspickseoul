package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AdministrationAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialComparisonAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ai-reports")
@Tag(name = "AI 리포트", description = "상권, 자치구, 행정동 분석 데이터를 AI 관점으로 요약하는 API를 제공합니다.")
public class AiReportWebController {

    private final AiReportWebUseCase aiReportWebUseCase;
    private final AiReportPresenter aiReportPresenter;

    @Operation(summary = "상권 AI 리포트 조회", description = "상권과 업종 분석 데이터를 기반으로 AI 요약 리포트를 조회합니다.")
    @GetMapping("/commercials/{commercialCode}")
    public ResponseEntity<Response<CommercialAiReportResponse>> getCommercialReport(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialAiReportResponse response = aiReportPresenter.toCommercialResponse(
            aiReportWebUseCase.getCommercialReport(commercialCode, serviceCode, periodCode)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 비교 AI 인사이트 조회", description = "두 상권의 비교 데이터를 기반으로 추천 상권과 실행 인사이트를 제공합니다.")
    @GetMapping("/commercials/comparisons")
    public ResponseEntity<Response<CommercialComparisonAiReportResponse>> getCommercialComparisonReport(
        @ParameterObject
        @ModelAttribute CommercialComparisonAiQuery query
    ) {
        CommercialComparisonAiReportResponse response = aiReportPresenter.toCommercialComparisonResponse(
            aiReportWebUseCase.getCommercialComparisonReport(query)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 AI 리포트 조회", description = "자치구 분석 데이터를 기반으로 AI 요약 리포트를 조회합니다.")
    @GetMapping("/districts/{districtCode}")
    public ResponseEntity<Response<DistrictAiReportResponse>> getDistrictReport(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        DistrictAiReportResponse response = aiReportPresenter.toDistrictResponse(
            aiReportWebUseCase.getDistrictReport(districtCode, periodCode)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "행정동 AI 리포트 조회", description = "행정동 분석 데이터를 기반으로 AI 요약 리포트를 조회합니다.")
    @GetMapping("/administrations/{administrationCode}")
    public ResponseEntity<Response<AdministrationAiReportResponse>> getAdministrationReport(
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        AdministrationAiReportResponse response = aiReportPresenter.toAdministrationResponse(
            aiReportWebUseCase.getAdministrationReport(administrationCode, periodCode)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }
}
