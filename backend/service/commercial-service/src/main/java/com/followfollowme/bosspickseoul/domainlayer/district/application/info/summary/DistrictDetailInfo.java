package com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.district.application.info.change.DistrictChangeIndicatorInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic.DistrictFootTrafficDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesDetailInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictStoreDetailInfo;
import lombok.Builder;

@Builder
public record DistrictDetailInfo(
    // 실제로 조회한 현재·비교 분기. 요청이 현재 분기를 생략하면 서버가 정한 기본 분기이고, 비교 분기는 그 직전 분기다(이슈 #464).
    String currentPeriodCode,
    String previousPeriodCode,
    // 인기 순위 이벤트에 자치구명을 실어 보내기 위한 필드. 응답 DTO 에는 노출하지 않는다.
    String districtName,
    DistrictChangeIndicatorInfo changeIndicator,
    DistrictFootTrafficDetailInfo footTraffic,
    DistrictStoreDetailInfo store,
    DistrictSalesDetailInfo sales
) {

}

