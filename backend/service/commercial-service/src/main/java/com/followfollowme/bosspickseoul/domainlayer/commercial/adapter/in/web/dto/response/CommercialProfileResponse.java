package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialProfileKeyMetricsItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 프로필 응답 DTO")
public record CommercialProfileResponse(

    @Schema(description = "기준 분기 코드", example = "20233")
    String periodCode,

    @Schema(description = "업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명", example = "강남역 상권")
    String commercialName,

    @Schema(description = "자치구 코드")
    String districtCode,

    @Schema(description = "자치구 이름")
    String districtName,

    @Schema(description = "행정동 코드")
    String administrationCode,

    @Schema(description = "행정동 이름")
    String administrationName,

    @Schema(description = "핵심 지표")
    CommercialProfileKeyMetricsItem keyMetrics
) {

}
