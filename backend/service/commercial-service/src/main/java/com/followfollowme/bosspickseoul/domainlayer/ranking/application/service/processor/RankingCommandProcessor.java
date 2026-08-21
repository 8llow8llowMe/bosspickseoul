package com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RankingCommandProcessor {

    private final AnalysisRankingStorePort analysisRankingStorePort;

    public void recordView(AnalysisViewEvent event) {
        analysisRankingStorePort.recordView(event);
    }
}
