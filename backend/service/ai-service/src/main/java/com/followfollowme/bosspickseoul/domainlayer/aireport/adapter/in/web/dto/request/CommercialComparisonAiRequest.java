package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.request;

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

    @Schema(description = "기준 분기 코드", example = AiReportRequestDefaults.PERIOD_CODE,
        defaultValue = AiReportRequestDefaults.PERIOD_CODE)
    String periodCode
) {

    /**
     * 기본값 보정은 web 계층에서만 한다. application 의 query 는 이미 확정된 값만 들고 다녀야
     * 워커가 저장된 잡 파라미터로 재구성할 때 같은 조건이 재현된다.
     */
    public CommercialComparisonAiRequest {
        periodCode = (periodCode == null || periodCode.isBlank()) ? AiReportRequestDefaults.PERIOD_CODE : periodCode;
    }

    public CommercialComparisonAiQuery toQuery() {
        return new CommercialComparisonAiQuery(leftCommercialCode, rightCommercialCode, serviceCode, periodCode);
    }
}
