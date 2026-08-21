package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "AI 리포트 작업 상태 응답 DTO")
public record AiReportJobStatusResponse(

    @Schema(description = "작업 식별자")
    String jobId,

    @Schema(description = "작업 종류 메타데이터",
        example = "{\"code\":\"COMMERCIAL\",\"name\":\"상권 AI 리포트\",\"description\":\"상권과 업종 분석 데이터를 기반으로 생성하는 AI 리포트입니다.\"}")
    CodeNameDescriptionMetadata jobType,

    @Schema(description = "작업 상태 메타데이터",
        example = "{\"code\":\"COMPLETED\",\"name\":\"완료\",\"description\":\"리포트 생성이 완료되었습니다.\"}")
    CodeNameDescriptionMetadata status,

    @Schema(description = "진행 문구 로테이션 목록 (status=PENDING/RUNNING 일 때만 채워짐). "
        + "프론트에서 3~5초 간격으로 순환 표시하는 UX 연출용이며 실제 처리 단계와는 무관합니다.",
        example = "[\"상권 유동인구 흐름을 분석하고 있어요.\",\"업종별 매출 데이터를 요약하고 있어요.\"]")
    List<String> progressMessages,

    @Schema(description = "완료된 상권 리포트 (status=COMPLETED 이고 jobType=COMMERCIAL 일 때 채워짐)")
    CommercialAiReportResponse commercialReport,

    @Schema(description = "완료된 상권 비교 인사이트 (status=COMPLETED 이고 jobType=COMMERCIAL_COMPARISON 일 때 채워짐)")
    CommercialComparisonAiReportResponse commercialComparisonReport,

    @Schema(description = "완료된 자치구 리포트 (status=COMPLETED 이고 jobType=DISTRICT 일 때 채워짐)")
    DistrictAiReportResponse districtReport,

    @Schema(description = "완료된 행정동 리포트 (status=COMPLETED 이고 jobType=ADMINISTRATION 일 때 채워짐)")
    AdministrationAiReportResponse administrationReport,

    @Schema(description = "실패 사유 코드 (status=FAILED 일 때만 채워짐)", example = "AI_002")
    String errorCode,

    @Schema(description = "실패 사유 메시지 (status=FAILED 일 때만 채워짐)")
    String errorMessage
) {

}
