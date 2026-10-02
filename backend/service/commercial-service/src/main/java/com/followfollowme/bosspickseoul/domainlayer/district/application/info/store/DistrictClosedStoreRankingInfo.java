package com.followfollowme.bosspickseoul.domainlayer.district.application.info.store;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedRankingQueryResult;
import lombok.Builder;

/** 자치구 폐업 점포 전체 순위 항목. 비교 분기 값이 없거나 0 이면 {@code closureChangeRate} 는 null 이다(이슈 #433). */
@Builder
public record DistrictClosedStoreRankingInfo(
    int rank,
    String districtCode,
    String districtName,
    long closedStoreCount,
    Double closureChangeRate
) {

    public static DistrictClosedStoreRankingInfo of(int rank, StoreDistrictClosedRankingQueryResult queryResult) {
        return new DistrictClosedStoreRankingInfo(
            rank,
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.closedStoreCount(),
            queryResult.closureChangeRate());
    }
}
