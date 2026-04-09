package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 AI 리포트 응답 DTO")
public record CommercialAiReportResponse(
    @Schema(description = "한 줄 요약")
    String summary,
    @Schema(description = "강점 목록")
    List<String> strengths,
    @Schema(description = "주의점 목록")
    List<String> risks,
    @Schema(description = "추천 업종군")
    List<String> recommendedBusinessCategories,
    @Schema(description = "추천 고객층")
    List<String> recommendedCustomerSegments,
    @Schema(description = "추천 운영 시간대")
    List<String> recommendedOperatingHours,
    @Schema(description = "피해야 할 운영 시간대")
    List<String> avoidOperatingHours,
    @Schema(description = "타깃 연령대")
    List<String> targetAgeGroups,
    @Schema(description = "타깃 성별")
    List<String> targetGenders,
    @Schema(description = "운영 팁")
    List<String> operationTips,
    @Schema(description = "창업 관점 코멘트")
    String businessInsight,
    @Schema(description = "리포트 생성 시각")
    LocalDateTime generatedAt
) {
}
