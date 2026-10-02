package com.followfollowme.bosspickseoul.domainlayer.district.application.info.store;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedRankingQueryResult;
import lombok.Builder;

/** 자치구 개업 점포 전체 순위 항목. 비교 분기 값이 없거나 0 이면 {@code openingChangeRate} 는 null 이다(이슈 #433). */
@Builder
public record DistrictOpenedStoreRankingInfo(
    int rank,
    String districtCode,
    String districtName,
    long openedStoreCount,
    Double openingChangeRate
) {

    public static DistrictOpenedStoreRankingInfo of(int rank, StoreDistrictOpenedRankingQueryResult queryResult) {
        return new DistrictOpenedStoreRankingInfo(
            rank,
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.openedStoreCount(),
            queryResult.openingChangeRate());
    }
}
