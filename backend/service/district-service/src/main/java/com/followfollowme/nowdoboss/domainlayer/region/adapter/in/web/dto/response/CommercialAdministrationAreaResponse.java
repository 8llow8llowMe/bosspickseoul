package com.followfollowme.nowdoboss.domainlayer.region.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 소속 지역 정보 조회 응답 DTO")
public record CommercialAdministrationAreaResponse(

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명", example = "역삼역")
    String commercialName,

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "행정동 코드", example = "11680101")
    String administrationCode,

    @Schema(description = "행정동명", example = "역삼1동")
    String administrationName
) {

}
