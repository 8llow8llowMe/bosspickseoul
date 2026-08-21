package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialHeatmapScoreItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 히트맵 점수 응답 DTO")
public record CommercialHeatmapScoresResponse(

    @Schema(description = "히트맵 모드 메타데이터")
    CodeNameDescriptionMetadata mode,

    @Schema(description = "서비스 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "기준 분기 코드", example = "20233")
    String periodCode,

    @Schema(description = "단일 지표 메타데이터", nullable = true)
    ScoreMetricMetadata metricType,

    @Schema(description = "후보 탐색 프리셋 메타데이터", nullable = true)
    CodeNameDescriptionMetadata preset,

    @Schema(description = "우선 반영 지표 메타데이터", nullable = true)
    ScoreMetricMetadata priorityMetric,

    @Schema(description = "응답 요약")
    String summary,

    @Schema(description = "상권별 히트맵 점수 목록")
    List<CommercialHeatmapScoreItem> scores
) {

}
