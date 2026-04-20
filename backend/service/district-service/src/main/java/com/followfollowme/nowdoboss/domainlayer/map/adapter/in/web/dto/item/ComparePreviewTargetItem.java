package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 프리뷰 대상 항목 DTO")
public record ComparePreviewTargetItem(

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명")
    String commercialName,

    @Schema(description = "자치구 코드")
    String districtCode,

    @Schema(description = "자치구 이름")
    String districtName,

    @Schema(description = "행정동 코드")
    String administrationCode,

    @Schema(description = "행정동 이름")
    String administrationName
) {

}
