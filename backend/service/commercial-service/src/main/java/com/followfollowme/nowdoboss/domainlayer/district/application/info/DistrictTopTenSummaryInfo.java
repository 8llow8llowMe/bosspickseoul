package com.followfollowme.nowdoboss.domainlayer.district.application.info;

import java.util.List;
import lombok.Builder;

@Builder
public record DistrictTopTenSummaryInfo(
    List<DistrictFootTrafficTopTenInfo> footTrafficTopTenInfos,
    List<DistrictSalesTopTenInfo> salesTopTenInfos,
    List<DistrictOpenedStoreTopTenInfo> openedStoreTopTenInfos,
    List<DistrictClosedStoreTopTenInfo> closedStoreTopTenInfos
) {

}
