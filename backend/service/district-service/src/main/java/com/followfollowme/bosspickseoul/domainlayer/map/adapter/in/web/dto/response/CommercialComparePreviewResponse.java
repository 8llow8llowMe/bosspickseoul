package com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.ComparePreviewMetricItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.ComparePreviewTargetItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 프리뷰 응답 DTO")
public record CommercialComparePreviewResponse(

    @Schema(description = "좌측 상권 요약")
    ComparePreviewTargetItem left,

    @Schema(description = "우측 상권 요약")
    ComparePreviewTargetItem right,

    @Schema(description = "추천 측 메타데이터")
    CodeNameDescriptionMetadata recommendedSide,

    @Schema(description = "핵심 지표 목록")
    List<ComparePreviewMetricItem> headlineMetrics,

    @Schema(description = "AI 한 줄 인사이트", example = "강남역이 매출 기준 32% 우위입니다.")
    String insightOneLiner
) {

}
