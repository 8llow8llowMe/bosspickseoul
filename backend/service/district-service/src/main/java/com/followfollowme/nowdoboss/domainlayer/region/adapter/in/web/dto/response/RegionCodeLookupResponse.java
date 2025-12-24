package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "지역 코드명 기반 조회 응답 DTO")
public record RegionCodeLookupResponse(

    @Schema(description = "자치구 코드", example = "11110")
    String districtCode,

    @Schema(description = "자치구 코드명", example = "종로구")
    String districtCodeName,

    @Schema(description = "행정동 코드", example = "11110515")
    String administrationCode,

    @Schema(description = "행정동 코드명", example = "청운효자동")
    String administrationCodeName,

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권 코드명", example = "배화여자대학교(박노수미술관)")
    String commercialCodeName
) {

}
