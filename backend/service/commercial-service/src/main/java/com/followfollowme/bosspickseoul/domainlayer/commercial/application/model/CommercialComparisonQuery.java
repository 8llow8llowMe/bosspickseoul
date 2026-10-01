package com.followfollowme.bosspickseoul.domainlayer.commercial.application.model;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "상권 비교 조회 조건")
public record CommercialComparisonQuery(

    @Schema(description = "좌측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110008")
    @NotBlank(message = CommercialValidationMessage.LEFT_COMMERCIAL_CODE_REQUIRED)
    String leftCommercialCode,

    @Schema(description = "우측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110012")
    @NotBlank(message = CommercialValidationMessage.RIGHT_COMMERCIAL_CODE_REQUIRED)
    String rightCommercialCode,

    @Schema(description = "서비스 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "CS100001")
    @NotBlank(message = CommercialValidationMessage.SERVICE_CODE_REQUIRED)
    String serviceCode,

    @Schema(description = AnalysisPeriodDefaults.PERIOD_CODE_DESCRIPTION, example = AnalysisPeriodDefaults.PERIOD_CODE, nullable = true)
    String periodCode
) {

    /** 생략된 분기를 Facade 가 적재 기준 기본 분기로 해석한 뒤 바꿔 끼운다(이슈 #464). 여기서 상수로 채우지 않는다. */
    public CommercialComparisonQuery withPeriodCode(String resolvedPeriodCode) {
        return new CommercialComparisonQuery(leftCommercialCode, rightCommercialCode, serviceCode, resolvedPeriodCode);
    }
}
