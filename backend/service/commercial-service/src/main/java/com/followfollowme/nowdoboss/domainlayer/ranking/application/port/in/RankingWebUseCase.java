package com.followfollowme.nowdoboss.domainlayer.ranking.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.dto.response.AnalysisRankingResponse;

public interface RankingWebUseCase {

    AnalysisRankingResponse getAnalysisRankings(String areaType, int size);
}
