package com.followfollowme.nowdoboss.domainlayer.ranking.application.info;

import com.followfollowme.nowdoboss.domainlayer.ranking.application.model.AnalysisRankingEntry;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import java.util.List;

public record AnalysisRankingInfo(

    AnalysisAreaType areaType,

    int windowHours,

    List<AnalysisRankingEntry> entries

) {

}
