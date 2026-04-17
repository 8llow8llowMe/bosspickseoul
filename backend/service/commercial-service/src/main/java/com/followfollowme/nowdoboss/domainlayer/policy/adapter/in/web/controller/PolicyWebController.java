package com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationsResponse;
import com.followfollowme.nowdoboss.domainlayer.policy.application.port.in.PolicyWebUseCase;
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
@RequestMapping("/api/v1")
@Tag(name = "정책 추천", description = "상권 분석 결과와 조건에 맞는 서울시 공공지원 정책 정보를 제공합니다.")
public class PolicyWebController {

    private final PolicyWebUseCase policyWebUseCase;

    @Operation(summary = "정책 추천 조회", description = "지역과 창업 조건에 맞는 정책 추천 목록을 조회합니다.")
    @GetMapping("/policies/recommendations")
    public ResponseEntity<Response<PolicyRecommendationsResponse>> getRecommendations(
        @Parameter(description = "자치구 코드", example = "11680") @RequestParam(required = false) String districtCode,
        @Parameter(description = "행정동 코드", example = "11680521") @RequestParam(required = false) String administrationCode,
        @Parameter(description = "업종 유형", example = "외식") @RequestParam(required = false) String businessType,
        @Parameter(description = "연령대", example = "청년") @RequestParam(required = false) String ageGroup,
        @Parameter(description = "창업 단계", example = "예비 창업") @RequestParam(required = false) String startupStage
    ) {
        PolicyRecommendationsResponse response = policyWebUseCase.getRecommendations(
            districtCode,
            administrationCode,
            businessType,
            ageGroup,
            startupStage
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 비교 정책 추천 조회", description = "두 상권의 비교 상황에 맞는 정책 추천 목록을 조회합니다.")
    @GetMapping("/commercials/compare/policies")
    public ResponseEntity<Response<PolicyRecommendationsResponse>> getComparisonRecommendations(
        @Parameter(description = "좌측 상권 코드", required = true, example = "3110008") @RequestParam String leftCommercialCode,
        @Parameter(description = "우측 상권 코드", required = true, example = "3110012") @RequestParam String rightCommercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        PolicyRecommendationsResponse response = policyWebUseCase.getComparisonRecommendations(
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }
}
