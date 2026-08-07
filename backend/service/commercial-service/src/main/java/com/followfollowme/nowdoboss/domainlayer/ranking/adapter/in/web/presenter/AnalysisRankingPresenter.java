package com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.dto.item.AnalysisRankingItem;
import com.followfollowme.nowdoboss.domainlayer.ranking.adapter.in.web.dto.response.AnalysisRankingResponse;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.info.AnalysisRankingInfo;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AnalysisRankingPresenter {

    public AnalysisRankingResponse toRankingResponse(AnalysisRankingInfo info) {
        List<AnalysisRankingItem> items = new ArrayList<>(info.entries().size());
        for (int index = 0; index < info.entries().size(); index++) {
            var entry = info.entries().get(index);
            items.add(AnalysisRankingItem.builder()
                .rank(index + 1)
                .areaCode(entry.areaCode())
                .areaName(entry.areaName())
                .viewCount(entry.viewCount())
                .build());
        }

        return AnalysisRankingResponse.builder()
            .areaType(info.areaType().toMetadata())
            .windowHours(info.windowHours())
            .rankings(items)
            .build();
    }
}
