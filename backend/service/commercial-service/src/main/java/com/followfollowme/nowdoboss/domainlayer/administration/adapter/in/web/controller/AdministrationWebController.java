package com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.administration.application.port.in.AdministrationWebUseCase;
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
@RequestMapping("/api/v1/administrations")
@Tag(name = "행정동 분석", description = "행정동 단위 상권 분석 조회 API")
public class AdministrationWebController {

    private final AdministrationWebUseCase administrationWebUseCase;

    @Operation(summary = "행정동 통합 상세 조회", description = "행정동 기준 매출, 소득, 지출 정보를 통합 조회합니다.")
    @GetMapping("/{administrationCode}")
    public ResponseEntity<Response<AdministrationDetailResponse>> getAdministrationDetail(
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 분기 코드 (YYYYQ), 미입력 시 직전 분기를 사용합니다.", example = "20232") @RequestParam(required = false) String previousPeriodCode
    ) {
        AdministrationDetailResponse response = administrationWebUseCase.getAdministrationDetail(
            administrationCode,
            currentPeriodCode,
            previousPeriodCode
        );
        return ResponseEntity.ok().body(Response.success(response));
    }
}
