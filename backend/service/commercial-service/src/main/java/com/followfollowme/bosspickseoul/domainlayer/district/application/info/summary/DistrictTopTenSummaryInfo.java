package com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic.DistrictFootTrafficTopTenInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesTopTenInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictClosedStoreTopTenInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictOpenedStoreTopTenInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record DistrictTopTenSummaryInfo(
    // 실제로 조회한 현재·비교 분기. 요청이 현재 분기를 생략하면 서버가 정한 기본 분기이고, 비교 분기는 그 직전 분기다(이슈 #464).
    String currentPeriodCode,
    String previousPeriodCode,
    List<DistrictFootTrafficTopTenInfo> footTrafficTopTenInfos,
    List<DistrictSalesTopTenInfo> salesTopTenInfos,
    List<DistrictOpenedStoreTopTenInfo> openedStoreTopTenInfos,
    List<DistrictClosedStoreTopTenInfo> closedStoreTopTenInfos
) {

}

