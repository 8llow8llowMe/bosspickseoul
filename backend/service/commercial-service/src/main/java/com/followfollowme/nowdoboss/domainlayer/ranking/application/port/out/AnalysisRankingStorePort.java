package com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.ranking.application.model.AnalysisRankingEntry;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import java.util.List;

public interface AnalysisRankingStorePort {

    /**
     * 조회 이벤트를 집계에 반영한다. 저장소 장애 시 예외를 던지지 않고 이벤트를 버린다
     * (컨슈머가 재시도 루프에 빠지지 않게 하기 위함).
     */
    void recordView(AnalysisViewEvent event);

    /**
     * 최근 윈도우 내 조회 수 상위 목록을 반환한다. 저장소 장애 시 RANKING_002 를 던진다.
     */
    List<AnalysisRankingEntry> getTopRankings(AnalysisAreaType areaType, int size);
}
