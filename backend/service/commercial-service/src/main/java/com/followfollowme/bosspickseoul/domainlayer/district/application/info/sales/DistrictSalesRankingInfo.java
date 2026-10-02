package com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.SalesDistrictRankingQueryResult;
import lombok.Builder;

/** 자치구 매출 전체 순위 항목. 비교 분기 값이 없거나 0 이면 {@code salesChangeRate} 는 null 이다(이슈 #433). */
@Builder
public record DistrictSalesRankingInfo(
    int rank,
    String districtCode,
    String districtName,
    long totalSalesAmount,
    Double salesChangeRate
) {

    public static DistrictSalesRankingInfo of(int rank, SalesDistrictRankingQueryResult queryResult) {
        return new DistrictSalesRankingInfo(
            rank,
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.totalSalesAmount(),
            queryResult.salesChangeRate());
    }
}
