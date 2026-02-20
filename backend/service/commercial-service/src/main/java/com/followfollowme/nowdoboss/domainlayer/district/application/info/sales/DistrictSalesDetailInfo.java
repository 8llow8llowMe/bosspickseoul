package com.followfollowme.nowdoboss.domainlayer.district.application.info.sales;

import java.util.List;
import lombok.Builder;

@Builder
public record DistrictSalesDetailInfo(
    List<DistrictSalesServiceTopInfo> topSalesServices,
    List<DistrictSalesAdministrationTopInfo> topSalesAdministrations
) {

}

