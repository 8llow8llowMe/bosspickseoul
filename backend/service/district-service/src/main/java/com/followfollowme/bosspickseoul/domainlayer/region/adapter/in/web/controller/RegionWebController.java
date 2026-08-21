package com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.AdministrationDistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.CommercialAdministrationAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.CommercialAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.DistrictAreaResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.dto.response.RegionCodeLookupResponse;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.in.RegionWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.enums.RegionCodeType;
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
@Tag(name = "지역 조회", description = "자치구, 행정동, 상권의 계층형 지역 정보를 조회하는 API를 제공합니다.")
public class RegionWebController {

    private final RegionWebUseCase regionWebUseCase;

    @Operation(summary = "자치구 단건 조회", description = "자치구 코드로 자치구 명칭을 조회합니다.")
    @GetMapping("/districts/{districtCode}")
    public ResponseEntity<Response<DistrictAreaResponse>> getDistrictByDistrictCode(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode
    ) {
        DistrictAreaResponse response = regionWebUseCase.getDistrictByDistrictCode(districtCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "자치구 소속 행정동 목록 조회", description = "선택한 자치구에 포함된 행정동 목록과 중심 좌표를 조회합니다.")
    @GetMapping("/districts/{districtCode}/administrations")
    public ResponseEntity<Response<List<AdministrationAreaResponse>>> getAdministrationsByDistrictCode(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode
    ) {
        List<AdministrationAreaResponse> response = regionWebUseCase.getAdministrationsByDistrictCode(districtCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "행정동 소속 상권 목록 조회", description = "선택한 행정동에 포함된 상권 목록과 중심 좌표를 조회합니다.")
    @GetMapping("/districts/{districtCode}/administrations/{administrationCode}/commercials")
    public ResponseEntity<Response<List<CommercialAreaResponse>>> getCommercialsByAdministrationCode(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "행정동 코드", required = true, example = "11680101") @PathVariable String administrationCode
    ) {
        List<CommercialAreaResponse> response = regionWebUseCase.getCommercialsByAdministrationCode(districtCode, administrationCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "지역 명칭 기준 코드 조회", description = "자치구명, 행정동명, 상권명을 기준으로 지역 코드를 조회합니다.")
    @GetMapping("/code-lookup")
    public ResponseEntity<Response<RegionCodeLookupResponse>> lookupRegionCode(
        @Parameter(description = "지역 코드 유형", required = true, example = "DISTRICT") @RequestParam RegionCodeType type,
        @Parameter(description = "지역 명칭", required = true, example = "종로구") @RequestParam String name
    ) {
        RegionCodeLookupResponse response = regionWebUseCase.lookupRegionCode(type, name);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "행정동 상위 지역 조회", description = "행정동 코드로 소속 자치구와 행정동 정보를 조회합니다.")
    @GetMapping("/administrations/{administrationCode}")
    public ResponseEntity<Response<AdministrationDistrictAreaResponse>> getAdministrationDistrictByAdministrationCode(
        @Parameter(description = "행정동 코드", required = true, example = "11680101") @PathVariable String administrationCode
    ) {
        AdministrationDistrictAreaResponse response = regionWebUseCase.getAdministrationDistrictByAdministrationCode(administrationCode);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "상권 소속 지역 조회", description = "상권 코드로 소속 행정동과 자치구 정보를 조회합니다.")
    @GetMapping("/commercials/{commercialCode}/administration")
    public ResponseEntity<Response<CommercialAdministrationAreaResponse>> getCommercialAdministrationByCommercialCode(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode
    ) {
        CommercialAdministrationAreaResponse response = regionWebUseCase.getCommercialAdministrationByCommercialCode(commercialCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
