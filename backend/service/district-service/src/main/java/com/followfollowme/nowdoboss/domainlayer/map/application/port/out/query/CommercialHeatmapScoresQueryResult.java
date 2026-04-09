package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoresQueryResult(
    List<CommercialHeatmapScoreQueryResult> scores
) {

}
