package com.followfollowme.bosspickseoul.domainlayer.district.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic.DistrictFootTrafficRankingInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales.DistrictSalesRankingInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictClosedStoreRankingInfo;
import com.followfollowme.bosspickseoul.domainlayer.district.application.info.store.DistrictOpenedStoreRankingInfo;
import java.util.List;
import lombok.Builder;

/** 자치구 지표별 전체 순위(이슈 #433). 지표마다 현재 분기 행이 있는 구가 모두 실리고, 순위는 표준 경쟁 순위다. */
@Builder
public record DistrictRankingSummaryInfo(
    // 실제로 조회한 현재·비교 분기. 요청이 현재 분기를 생략하면 서버가 정한 기본 분기이고, 비교 분기는 그 직전 분기다(이슈 #464).
    String currentPeriodCode,
    String previousPeriodCode,
    List<DistrictFootTrafficRankingInfo> footTrafficRankingInfos,
    List<DistrictSalesRankingInfo> salesRankingInfos,
    List<DistrictOpenedStoreRankingInfo> openedStoreRankingInfos,
    List<DistrictClosedStoreRankingInfo> closedStoreRankingInfos
) {

}
