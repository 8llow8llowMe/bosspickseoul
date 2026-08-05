package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "AI 리포트 작업 제출 응답 DTO. 캐시 hit 면 즉시 결과(200), miss 면 jobId(202).")
public record AiReportSubmissionResponse(

    @Schema(description = "제출 상태 메타데이터",
        example = "{\"code\":\"ACCEPTED\",\"name\":\"작업 접수됨\",\"description\":\"리포트 생성 작업이 접수되었습니다. 작업 상태 조회 API로 완료 여부를 확인해 주세요.\"}")
    CodeNameDescriptionMetadata submissionStatus,

    @Schema(description = "작업 종류 메타데이터",
        example = "{\"code\":\"COMMERCIAL\",\"name\":\"상권 AI 리포트\",\"description\":\"상권과 업종 분석 데이터를 기반으로 생성하는 AI 리포트입니다.\"}")
    CodeNameDescriptionMetadata jobType,

    @Schema(description = "작업 식별자 (ACCEPTED 일 때만 채워짐)", example = "8a64f9c0-...")
    String jobId,

    @Schema(description = "캐시된 상권 리포트 (CACHED 이고 jobType=COMMERCIAL 일 때 채워짐)")
    CommercialAiReportResponse commercialReport,

    @Schema(description = "캐시된 상권 비교 인사이트 (CACHED 이고 jobType=COMMERCIAL_COMPARISON 일 때 채워짐)")
    CommercialComparisonAiReportResponse commercialComparisonReport,

    @Schema(description = "캐시된 자치구 리포트 (CACHED 이고 jobType=DISTRICT 일 때 채워짐)")
    DistrictAiReportResponse districtReport,

    @Schema(description = "캐시된 행정동 리포트 (CACHED 이고 jobType=ADMINISTRATION 일 때 채워짐)")
    AdministrationAiReportResponse administrationReport
) {

}
