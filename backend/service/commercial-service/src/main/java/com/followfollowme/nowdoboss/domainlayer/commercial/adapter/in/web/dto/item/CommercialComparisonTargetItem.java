package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record CommercialComparisonTargetItem(
    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,
    @Schema(description = "상권명", example = "강남역")
    String commercialName,
    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,
    @Schema(description = "자치구명", example = "강남구")
    String districtName,
    @Schema(description = "행정동 코드", example = "11680521")
    String administrationCode,
    @Schema(description = "행정동명", example = "역삼1동")
    String administrationName
) {

}
