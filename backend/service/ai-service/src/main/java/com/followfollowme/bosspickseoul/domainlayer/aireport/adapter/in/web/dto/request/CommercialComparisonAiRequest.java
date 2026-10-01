package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "상권 비교 AI 리포트 조회 조건")
public record CommercialComparisonAiRequest(

    @Schema(description = "좌측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110008")
    @NotBlank(message = AiReportValidationMessage.LEFT_COMMERCIAL_CODE_REQUIRED)
    String leftCommercialCode,

    @Schema(description = "우측 상권 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "3110012")
    @NotBlank(message = AiReportValidationMessage.RIGHT_COMMERCIAL_CODE_REQUIRED)
    String rightCommercialCode,

    @Schema(description = "서비스 코드", requiredMode = Schema.RequiredMode.REQUIRED, example = "CS100001")
    @NotBlank(message = AiReportValidationMessage.SERVICE_CODE_REQUIRED)
    String serviceCode,

    @Schema(description = AnalysisPeriodDefaults.PERIOD_CODE_DESCRIPTION, example = AnalysisPeriodDefaults.PERIOD_CODE, nullable = true)
    String periodCode
) {

    /** 생략된 분기는 그대로(null) 넘긴다. {@code AiReportJobProcessor} 가 적재 기준 기본 분기로 해석한다(이슈 #464). */
    public CommercialComparisonAiQuery toQuery() {
        return new CommercialComparisonAiQuery(leftCommercialCode, rightCommercialCode, serviceCode, periodCode);
    }
}
