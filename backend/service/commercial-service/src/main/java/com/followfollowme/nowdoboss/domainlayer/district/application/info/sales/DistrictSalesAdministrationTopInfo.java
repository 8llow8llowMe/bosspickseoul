package com.followfollowme.nowdoboss.domainlayer.district.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.SalesAdministrationTopFiveQueryResult;
import lombok.Builder;

@Builder
public record DistrictSalesAdministrationTopInfo(
    String administrationCode,
    String administrationName,
    long totalSalesAmount,
    double salesChangeRate
) {

    public static DistrictSalesAdministrationTopInfo from(SalesAdministrationTopFiveQueryResult queryResult) {
        return new DistrictSalesAdministrationTopInfo(
            queryResult.administrationCode(),
            queryResult.administrationName(),
            queryResult.totalSalesAmount(),
            queryResult.salesChangeRate());
    }
}

