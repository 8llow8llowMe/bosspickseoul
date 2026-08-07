package com.followfollowme.nowdoboss.domainlayer.ranking.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingErrorCode;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingException;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.info.AnalysisRankingInfo;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.global.properties.RankingProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RankingQueryProcessor {

    private final AnalysisRankingStorePort analysisRankingStorePort;
    private final RankingProperties rankingProperties;

    public AnalysisRankingInfo getTopRankings(String areaType, int size) {
        AnalysisAreaType parsedAreaType = AnalysisAreaType.from(areaType);
        if (size < 1 || size > rankingProperties.maxSize()) {
            throw new RankingException(RankingErrorCode.INVALID_SIZE);
        }

        return new AnalysisRankingInfo(
            parsedAreaType,
            rankingProperties.windowHours(),
            analysisRankingStorePort.getTopRankings(parsedAreaType, size)
        );
    }
}
