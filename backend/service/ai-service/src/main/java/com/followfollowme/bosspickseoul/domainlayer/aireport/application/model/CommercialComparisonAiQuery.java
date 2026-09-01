package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "상권 비교 AI 리포트 조회 조건")
public record CommercialComparisonAiQuery(

    @Schema(description = "좌측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110008")
    @NotBlank(message = AiReportValidationMessage.LEFT_COMMERCIAL_CODE_REQUIRED)
    String leftCommercialCode,

    @Schema(description = "우측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110012")
    @NotBlank(message = AiReportValidationMessage.RIGHT_COMMERCIAL_CODE_REQUIRED)
    String rightCommercialCode,

    @Schema(description = "서비스 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "CS100001")
    @NotBlank(message = AiReportValidationMessage.SERVICE_CODE_REQUIRED)
    String serviceCode,

    @Schema(description = "기준 분기 코드", example = "20233", defaultValue = "20233")
    String periodCode
) {

    public CommercialComparisonAiQuery {
        periodCode = (periodCode == null || periodCode.isBlank()) ? "20233" : periodCode;
    }
}
