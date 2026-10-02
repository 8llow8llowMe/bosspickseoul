package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

/** 자치구 폐업 점포 전체 순위 조회 결과. 비교 분기 값이 없거나 0 이면 {@code closureChangeRate} 는 null 이다(이슈 #433). */
@Builder
public record StoreDistrictClosedRankingQueryResult(
    String districtCode,
    String districtName,
    long closedStoreCount,
    Double closureChangeRate
) {

}
