package com.followfollowme.nowdoboss.domainlayer.district.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.SalesDistrictTopTenQueryResult;
import lombok.Builder;

@Builder
public record DistrictSalesTopTenInfo(
    String districtCode,
    String districtName,
    long totalSalesAmount,
    double salesChangeRate
) {

    public static DistrictSalesTopTenInfo from(SalesDistrictTopTenQueryResult queryResult) {
        return new DistrictSalesTopTenInfo(
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.totalSalesAmount(),
            queryResult.salesChangeRate());
    }
}

