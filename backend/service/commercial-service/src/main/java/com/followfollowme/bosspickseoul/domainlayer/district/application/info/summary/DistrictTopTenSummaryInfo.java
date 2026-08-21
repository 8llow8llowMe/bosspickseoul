package com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic.DistrictFootTrafficTopTenInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesTopTenInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictClosedStoreTopTenInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictOpenedStoreTopTenInfo;
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

