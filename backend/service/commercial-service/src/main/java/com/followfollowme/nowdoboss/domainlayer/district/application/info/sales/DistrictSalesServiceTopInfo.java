package com.followfollowme.nowdoboss.domainlayer.district.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.SalesDistrictServiceTopFiveQueryResult;
import lombok.Builder;

@Builder
public record DistrictSalesServiceTopInfo(
    String serviceCode,
    String serviceName,
    double salesChangeRate
) {

    public static DistrictSalesServiceTopInfo from(SalesDistrictServiceTopFiveQueryResult queryResult) {
        return new DistrictSalesServiceTopInfo(
            queryResult.serviceCode(),
            queryResult.serviceName(),
            queryResult.salesChangeRate());
    }
}

