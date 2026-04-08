package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationDistrictAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.in.RegionWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.region.domain.enums.RegionCodeType;
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
@RequestMapping("/api/v1/regions")
@Tag(name = "지역", description = "지역 계층(자치구, 행정동, 상권) 조회 API")
public class RegionWebController {

    private final RegionWebUseCase regionWebUseCase;

    @Operation(summary = "자치구에 속한 행정동 목록 조회", description = "선택한 자치구에 포함된 행정동 목록과 중심 좌표를 조회합니다.")
    @GetMapping("/districts/{districtCode}/administrations")
    public ResponseEntity<Response<List<AdministrationAreaResponse>>> getAdministrationsByDistrictCode(
        @Parameter(description = "자치구 코드", required = true, example = "11110") @PathVariable String districtCode
    ) {
        List<AdministrationAreaResponse> response = regionWebUseCase.getAdministrationsByDistrictCode(districtCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "행정동에 속한 상권 목록 조회", description = "선택한 자치구와 행정동에 포함된 상권 목록과 중심 좌표를 조회합니다.")
    @GetMapping("/districts/{districtCode}/administrations/{administrationCode}/commercials")
    public ResponseEntity<Response<List<CommercialAreaResponse>>> getCommercialsByAdministrationCode(
        @Parameter(description = "자치구 코드", required = true, example = "11110") @PathVariable String districtCode,
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode
    ) {
        List<CommercialAreaResponse> response = regionWebUseCase.getCommercialsByAdministrationCode(districtCode, administrationCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "지역 코드명 기준 계층 조회", description = "자치구, 행정동, 상권 코드명을 기준으로 상위 지역 계층 정보를 조회합니다.")
    @GetMapping("/code-lookup")
    public ResponseEntity<Response<RegionCodeLookupResponse>> lookupRegionCode(
        @Parameter(description = "지역 코드 타입", required = true, example = "DISTRICT") @RequestParam RegionCodeType type,
        @Parameter(description = "지역 코드명", required = true, example = "종로구") @RequestParam String codeName
    ) {
        RegionCodeLookupResponse response = regionWebUseCase.lookupRegionCode(type, codeName);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "행정동 코드 기준 상위 지역 조회", description = "주어진 행정동 코드가 속한 자치구와 행정동 정보를 조회합니다.")
    @GetMapping("/administrations/{administrationCode}")
    public ResponseEntity<Response<AdministrationDistrictAreaResponse>> getAdministrationDistrictByAdministrationCode(
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode
    ) {
        AdministrationDistrictAreaResponse response = regionWebUseCase.getAdministrationDistrictByAdministrationCode(administrationCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 코드 기준 소속 행정동 조회", description = "주어진 상권 코드가 속한 행정동과 자치구 정보를 조회합니다.")
    @GetMapping("/commercials/{commercialCode}/administration")
    public ResponseEntity<Response<CommercialAdministrationAreaResponse>> getCommercialAdministrationByCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode
    ) {
        CommercialAdministrationAreaResponse response = regionWebUseCase.getCommercialAdministrationByCommercialCode(commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
