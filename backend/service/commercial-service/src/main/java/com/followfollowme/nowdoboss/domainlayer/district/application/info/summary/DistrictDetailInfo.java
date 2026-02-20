package com.followfollowme.nowdoboss.domainlayer.district.application.info.summary;

import com.followfollowme.nowdoboss.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import lombok.Builder;

@Builder
public record DistrictDetailInfo(
    DistrictChangeIndicatorInfo changeIndicator,
    DistrictFootTrafficDetailInfo footTraffic,
    DistrictStoreDetailInfo store,
    DistrictSalesDetailInfo sales
) {

}

