package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.ChangeIndicatorDistrictResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesAdministrationDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictSalesDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictStoreDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.DistrictTopTenSummaryResponse;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.response.FootTrafficDistrictDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.in.DistrictWebUseCase;
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
@RequestMapping("/api/v1/districts")
@Tag(name = "자치구 분석", description = "자치구 단위 상권 분석 정보를 조회하는 API를 제공합니다.")
public class DistrictWebController {

    private final DistrictWebUseCase districtWebUseCase;

    @Operation(summary = "자치구 Top 10 요약 조회", description = "유동인구, 매출, 개업률, 폐업률 Top 10 정보를 조회합니다.")
    @GetMapping("/top-ten")
    public ResponseEntity<Response<DistrictTopTenSummaryResponse>> getTopTenDistricts(
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 분기 코드 (YYYYQ), 미입력 시 직전 분기를 사용합니다.", example = "20232") @RequestParam(required = false) String previousPeriodCode
    ) {
        DistrictTopTenSummaryResponse response = districtWebUseCase.getTopTenDistricts(currentPeriodCode, previousPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 통합 상세 조회", description = "변화지표, 유동인구, 점포, 매출 상세 정보를 통합 조회합니다.")
    @GetMapping("/{districtCode}")
    public ResponseEntity<Response<DistrictDetailResponse>> getDistrictDetail(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 분기 코드 (YYYYQ), 미입력 시 직전 분기를 사용합니다.", example = "20232") @RequestParam(required = false) String previousPeriodCode
    ) {
        DistrictDetailResponse response = districtWebUseCase.getDistrictDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 유동인구 상세 조회", description = "분기 추이, 시간대, 성별, 연령, 요일별 유동인구를 조회합니다.")
    @GetMapping("/{districtCode}/foot-traffic")
    public ResponseEntity<Response<FootTrafficDistrictDetailResponse>> getDistrictFootTrafficDetail(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 분기 코드 (YYYYQ), 미입력 시 직전 분기를 사용합니다.", example = "20232") @RequestParam(required = false) String previousPeriodCode
    ) {
        FootTrafficDistrictDetailResponse response =
            districtWebUseCase.getDistrictFootTrafficDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 변화지표 상세 조회", description = "특정 분기의 자치구 상권 변화지표 상세 정보를 조회합니다.")
    @GetMapping("/{districtCode}/change-indicators")
    public ResponseEntity<Response<ChangeIndicatorDistrictResponse>> getDistrictChangeDetail(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode
    ) {
        ChangeIndicatorDistrictResponse response = districtWebUseCase.getDistrictChangeDetail(districtCode, currentPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 점포 상세 조회", description = "업종별 점포 수 Top 8, 개업률 Top 5, 폐업률 Top 5를 조회합니다.")
    @GetMapping("/{districtCode}/stores/top-services")
    public ResponseEntity<Response<DistrictStoreDetailResponse>> getDistrictTotalStoreDetail(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode
    ) {
        DistrictStoreDetailResponse response = districtWebUseCase.getDistrictTotalStoreDetail(districtCode, currentPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 매출 Top 5 조회", description = "업종 Top 5와 행정동 Top 5 매출 정보를 조회합니다.")
    @GetMapping("/{districtCode}/sales/top-services")
    public ResponseEntity<Response<DistrictSalesDetailResponse>> getDistrictSalesTopFiveDetail(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 분기 코드 (YYYYQ), 미입력 시 직전 분기를 사용합니다.", example = "20232") @RequestParam(required = false) String previousPeriodCode
    ) {
        DistrictSalesDetailResponse response =
            districtWebUseCase.getDistrictSalesTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 행정동 매출 Top 5 조회", description = "자치구 기준 행정동 매출 상위 5개를 조회합니다.")
    @GetMapping("/{districtCode}/sales/top-administrations")
    public ResponseEntity<Response<DistrictSalesAdministrationDetailResponse>> getDistrictSalesAdministrationTopFiveDetail(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode,
        @Parameter(description = "이전 기준 분기 코드 (YYYYQ), 미입력 시 직전 분기를 사용합니다.", example = "20232") @RequestParam(required = false) String previousPeriodCode
    ) {
        DistrictSalesAdministrationDetailResponse response =
            districtWebUseCase.getDistrictSalesAdministrationTopFiveDetail(districtCode, currentPeriodCode, previousPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "전체 자치구 목록 조회", description = "분기 기준 자치구 코드와 이름 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<Response<List<DistrictAreaResponse>>> getAllDistricts(
        @Parameter(description = "현재 기준 분기 코드 (YYYYQ)", example = "20233") @RequestParam(defaultValue = "20233") String currentPeriodCode
    ) {
        List<DistrictAreaResponse> response = districtWebUseCase.getAllDistricts(currentPeriodCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
