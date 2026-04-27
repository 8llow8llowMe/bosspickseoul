package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "AI 리포트 작업 제출 응답 DTO. 캐시 hit 면 즉시 결과(200), miss 면 jobId(202).")
public record AiReportSubmissionResponse(

    @Schema(description = "제출 상태", example = "ACCEPTED")
    AiReportSubmissionStatus submissionStatus,

    @Schema(description = "작업 종류", example = "COMMERCIAL")
    AiReportJobType jobType,

    @Schema(description = "작업 식별자 (ACCEPTED 일 때만 채워짐)", example = "8a64f9c0-...")
    String jobId,

    @Schema(description = "캐시된 상권 리포트 (CACHED 일 때만 채워짐)")
    CommercialAiReportResponse commercialReport
) {

}
