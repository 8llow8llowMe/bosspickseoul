package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "상권 비교 조회 조건")
public record CommercialComparisonQuery(

    @Schema(description = "좌측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110008")
    String leftCommercialCode,

    @Schema(description = "우측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110012")
    String rightCommercialCode,

    @Schema(description = "서비스 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "CS100001")
    String serviceCode,

    @Schema(description = "기준 분기 코드", example = "20233", defaultValue = "20233")
    String periodCode
) {

    public CommercialComparisonQuery {
        periodCode = (periodCode == null || periodCode.isBlank()) ? "20233" : periodCode;
    }
}
