package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialHeatmapScoreItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 히트맵 점수 응답 DTO")
public record CommercialHeatmapScoresResponse(
    @Schema(description = "상권별 히트맵 점수 목록")
    List<CommercialHeatmapScoreItem> scores
) {

}
