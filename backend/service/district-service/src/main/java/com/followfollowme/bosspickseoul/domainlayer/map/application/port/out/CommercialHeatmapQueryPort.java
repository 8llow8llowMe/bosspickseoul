package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import java.util.List;

public interface CommercialHeatmapQueryPort {

    CommercialHeatmapScoresQueryResult getHeatmapScores(
        List<String> commercialCodes,
        String serviceCode,
        String metricType,
        String periodCode
    );

    CommercialHeatmapScoresQueryResult getCompositeHeatmapScores(
        List<String> commercialCodes,
        String serviceCode,
        String preset,
        String priorityMetric,
        String periodCode
    );
}
