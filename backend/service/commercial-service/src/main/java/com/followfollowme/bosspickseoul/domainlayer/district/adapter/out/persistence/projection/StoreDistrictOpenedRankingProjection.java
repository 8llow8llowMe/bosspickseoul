package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection;

/** 자치구 개업 점포 전체 순위 행. 비교 분기 값이 없거나 0 이면 {@code openingChangeRate} 는 null 이다(이슈 #433). */
public record StoreDistrictOpenedRankingProjection(
    String districtCode,
    String districtName,
    long openedStoreCount,
    Double openingChangeRate
) {

}
