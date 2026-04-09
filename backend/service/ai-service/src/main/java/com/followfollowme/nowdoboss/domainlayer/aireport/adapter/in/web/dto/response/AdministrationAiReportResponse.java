package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "행정동 AI 리포트 응답 DTO")
public record AdministrationAiReportResponse(
    @Schema(description = "시장 요약")
    String summary,
    @Schema(description = "시장 상태 요약")
    String marketStatus,
    @Schema(description = "추천 업종군")
    List<String> recommendedBusinessCategories,
    @Schema(description = "주의 업종군")
    List<String> cautionBusinessCategories,
    @Schema(description = "창업 관점 코멘트")
    String businessInsight,
    @Schema(description = "리포트 생성 시각")
    LocalDateTime generatedAt
) {
}
