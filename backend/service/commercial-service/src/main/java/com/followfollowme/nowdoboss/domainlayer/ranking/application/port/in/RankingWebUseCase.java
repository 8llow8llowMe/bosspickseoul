package com.followfollowme.nowdoboss.domainlayer.ranking.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.dto.response.AnalysisRankingResponse;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;

public interface RankingWebUseCase {

    AnalysisRankingResponse getAnalysisRankings(AnalysisAreaType areaType, int size);
}
