package com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.FootTrafficDistrictRankingQueryResult;
import lombok.Builder;

/** 자치구 유동인구 전체 순위 항목. 비교 분기 값이 없거나 0 이면 {@code footTrafficChangeRate} 는 null 이다(이슈 #433). */
@Builder
public record DistrictFootTrafficRankingInfo(
    int rank,
    String districtCode,
    String districtName,
    long totalFootTraffic,
    Double footTrafficChangeRate
) {

    public static DistrictFootTrafficRankingInfo of(int rank, FootTrafficDistrictRankingQueryResult queryResult) {
        return new DistrictFootTrafficRankingInfo(
            rank,
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.totalFootTraffic(),
            queryResult.footTrafficChangeRate());
    }
}
