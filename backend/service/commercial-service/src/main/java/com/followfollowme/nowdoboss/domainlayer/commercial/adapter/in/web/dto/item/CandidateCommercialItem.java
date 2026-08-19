package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 항목 DTO")
public record CandidateCommercialItem(

    @Schema(description = "추천 랭킹", example = "1")
    int rank,

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명", example = "강남역 상권")
    String commercialName,

    @Schema(description = "프리셋 가중치 기반 복합 점수 (0~100)", nullable = true)
    Double compositeScore,

    @Schema(description = "복합 점수 등급", example = "HIGH")
    String grade,

    @Schema(description = "요약 라벨", example = "공격형 추천")
    String summaryLabel,

    @Schema(description = "선정 이유 한 줄 설명")
    String selectionReason,

    @Schema(description = "기회도 해석 라벨", nullable = true)
    String opportunityLabel,

    @Schema(description = "위험도 해석 라벨", nullable = true)
    String riskLabel,

    @Schema(description = "지표별 세부 점수")
    List<MetricBreakdownItem> metricBreakdown,

    @Schema(description = "추천 이유 태그", example = "[\"기회도 상위\", \"위험도 낮음\"]")
    List<String> reasonTags,

    @Schema(description = "블루오션 업종 Top 5 — 소속 행정동엔 많지만 이 상권엔 적은 업종 (업종별 상권 추천 응답에서만 채워짐)",
        nullable = true)
    List<BlueOceanCategoryItem> blueOceanCategories
) {

}
