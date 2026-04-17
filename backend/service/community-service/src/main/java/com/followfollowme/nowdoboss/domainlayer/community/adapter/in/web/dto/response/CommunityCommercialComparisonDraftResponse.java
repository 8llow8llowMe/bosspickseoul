package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 게시글 초안 응답 DTO")
public record CommunityCommercialComparisonDraftResponse(

    @Schema(description = "게시글 대상 타입", example = "COMMERCIAL")
    String targetType,

    @Schema(description = "게시글 대상 코드", example = "3110008")
    String targetCode,

    @Schema(description = "게시글 대상 이름")
    String targetName,

    @Schema(description = "추천 제목")
    String title,

    @Schema(description = "추천 본문")
    String content,

    @Schema(description = "분석 첨부 타입", example = "COMMERCIAL_COMPARISON")
    String analysisType,

    @Schema(description = "분석 참조 코드", example = "3110008:3110012:CS100001:20233")
    String analysisRefCode,

    @Schema(description = "분석 참조 이름")
    String analysisRefName,

    @Schema(description = "분석 스냅샷 키", example = "comparison-3110008-3110012-20233")
    String analysisSnapshotKey
) {
}
