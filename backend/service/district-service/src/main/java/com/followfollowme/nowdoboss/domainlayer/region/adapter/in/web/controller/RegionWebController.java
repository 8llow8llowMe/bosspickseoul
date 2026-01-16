package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response.AdministrationAreaResponse;
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
@RequestMapping("/api/v1")
@Tag(name = "지역", description = "지역 계층(자치구/행정동/상권) 탐색 관련 클라이언트 전용 API 입니다.")
public class RegionWebController {

    private final RegionWebUseCase regionWebUseCase;

    @Operation(
        summary = "자치구에 속한 행정동 목록 조회",
        description = "선택한 자치구에 포함된 행정동 목록과 중심 좌표를 조회합니다."
    )
    @GetMapping("/districts/{districtCode}/administrations")
    public ResponseEntity<Response<List<AdministrationAreaResponse>>> getAdministrationsByDistrictCode(
        @Parameter(description = "자치구 코드", required = true, example = "11110") @PathVariable String districtCode
    ) {
        List<AdministrationAreaResponse> responses = regionWebUseCase.getAdministrationsByDistrictCode(districtCode);
        return ResponseEntity.ok().body(Response.success(responses));
    }

    @Operation(
        summary = "행정동에 속한 상권 목록 조회",
        description = "선택한 행정동에 포함된 상권 목록과 중심 좌표를 조회합니다."
    )
    @GetMapping("/administrations/{administrationCode}/commercial-areas")
    public ResponseEntity<Response<List<CommercialAreaResponse>>> getCommercialAreas(
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode
    ) {
        List<CommercialAreaResponse> responses = regionWebUseCase.getCommercialsByAdministrationCode(administrationCode);
        return ResponseEntity.ok().body(Response.success(responses));
    }

    @Operation(
        summary = "지역 코드명 기반 계층 조회",
        description = "자치구 / 행정동 / 상권 코드명을 기준으로 상위 지역 계층 정보를 조회합니다."
    )
    @GetMapping("/regions/code-lookup")
    public ResponseEntity<Response<RegionCodeLookupResponse>> lookupRegionCode(
        @Parameter(description = "지역 코드 타입", required = true, example = "DISTRICT") @RequestParam RegionCodeType type,
        @Parameter(description = "지역 코드명", required = true, example = "종로구") @RequestParam String codeName
    ) {
        RegionCodeLookupResponse response = regionWebUseCase.getRegionCodeLookup(type, codeName);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
