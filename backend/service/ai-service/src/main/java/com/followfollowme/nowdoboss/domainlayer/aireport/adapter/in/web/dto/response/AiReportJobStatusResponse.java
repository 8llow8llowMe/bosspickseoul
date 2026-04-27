package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "AI 리포트 작업 상태 응답 DTO")
public record AiReportJobStatusResponse(

    @Schema(description = "작업 식별자")
    String jobId,

    @Schema(description = "작업 종류", example = "COMMERCIAL")
    AiReportJobType jobType,

    @Schema(description = "작업 상태", example = "COMPLETED")
    AiReportJobStatus status,

    @Schema(description = "완료된 상권 리포트 (status=COMPLETED 이고 jobType=COMMERCIAL 일 때 채워짐)")
    CommercialAiReportResponse commercialReport,

    @Schema(description = "실패 사유 코드 (status=FAILED 일 때만 채워짐)", example = "AI_002")
    String errorCode,

    @Schema(description = "실패 사유 메시지 (status=FAILED 일 때만 채워짐)")
    String errorMessage
) {

}
