package com.followfollowme.bosspickseoul.domainlayer.ranking.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception.RankingErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception.RankingException;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.info.AnalysisRankingInfo;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.bosspickseoul.global.properties.RankingProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RankingQueryProcessor {

    private final AnalysisRankingStorePort analysisRankingStorePort;
    private final RankingProperties rankingProperties;

    public AnalysisRankingInfo getTopRankings(AnalysisAreaType areaType, int size) {
        if (size < 1 || size > rankingProperties.maxSize()) {
            throw new RankingException(RankingErrorCode.INVALID_SIZE);
        }

        return new AnalysisRankingInfo(
            areaType,
            rankingProperties.windowHours(),
            analysisRankingStorePort.getTopRankings(areaType, size)
        );
    }
}
