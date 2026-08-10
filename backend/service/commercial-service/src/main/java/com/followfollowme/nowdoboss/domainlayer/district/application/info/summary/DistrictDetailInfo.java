package com.followfollowme.nowdoboss.domainlayer.district.application.info.summary;

import com.followfollowme.nowdoboss.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import lombok.Builder;

@Builder
public record DistrictDetailInfo(
    // 인기 순위 이벤트에 자치구명을 실어 보내기 위한 필드. 응답 DTO 에는 노출하지 않는다.
    String districtName,
    DistrictChangeIndicatorInfo changeIndicator,
    DistrictFootTrafficDetailInfo footTraffic,
    DistrictStoreDetailInfo store,
    DistrictSalesDetailInfo sales
) {

}

