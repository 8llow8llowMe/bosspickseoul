package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.Map;
import java.util.SortedSet;

/**
 * 데이터셋별로 팩트 테이블에 적재된 분기를 읽는다.
 *
 * <p>정본은 commercial 스키마의 typed 팩트 테이블 15종이다. {@code dataset_active_release} 는 게시 상태라
 * 이관(project)이 끝나지 않은 분기를 담을 수 있어 정본으로 쓰지 않는다 — 조회 API 가 실제로 읽는 행이 있어야 한다.
 */
public interface AnalysisDatasetPeriodQueryPort {

    /**
     * 주어진 공간 스냅샷의 데이터셋별 적재 분기({@code YYYYQ}, 오름차순). {@link DatasetKey} 15종을 모두 키로 담고,
     * 행이 없는 데이터셋은 빈 집합이다.
     */
    Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion);
}
