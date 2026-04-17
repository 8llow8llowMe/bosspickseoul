package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 AI 리포트 응답 DTO")
public record CommercialComparisonAiReportResponse(

    @Schema(description = "비교 결과 전체 요약")
    String summary,

    @Schema(description = "추천 상권 방향", example = "LEFT")
    String recommendedSide,

    @Schema(description = "추천 이유 목록")
    List<String> recommendedReasons,

    @Schema(description = "위험도 비교 요약")
    String riskComparison,

    @Schema(description = "시간대 비교 요약")
    String timeSlotInsight,

    @Schema(description = "고객층 비교 요약")
    String customerSegmentInsight,

    @Schema(description = "운영 전략 목록")
    List<String> operationStrategy,

    @Schema(description = "한 줄 인사이트")
    String businessInsight,

    @Schema(description = "리포트 생성 시각")
    LocalDateTime generatedAt
) {
}
