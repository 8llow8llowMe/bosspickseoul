package com.followfollowme.nowdoboss.domainlayer.ranking.application.service;

import com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.dto.response.AnalysisRankingResponse;
import com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.presenter.AnalysisRankingPresenter;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.in.RankingWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.service.processor.RankingQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RankingWebFacade implements RankingWebUseCase {

    private final RankingQueryProcessor rankingQueryProcessor;
    private final AnalysisRankingPresenter analysisRankingPresenter;

    @Override
    public AnalysisRankingResponse getAnalysisRankings(AnalysisAreaType areaType, int size) {
        return analysisRankingPresenter.toRankingResponse(rankingQueryProcessor.getTopRankings(areaType, size));
    }
}
