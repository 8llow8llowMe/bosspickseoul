package com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.in.web.dto.response.AnalysisRankingResponse;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;

public interface RankingWebUseCase {

    AnalysisRankingResponse getAnalysisRankings(AnalysisAreaType areaType, int size);
}
