package com.followfollowme.bosspickseoul.domainlayer.district.application.info.sales;

import java.util.List;
import lombok.Builder;

/** 자치구 행정동별 매출 상위 조회 결과와 실제로 조회한 분기(이슈 #464). */
@Builder
public record DistrictSalesAdministrationDetailInfo(
    // 실제로 조회한 현재·비교 분기. 요청이 현재 분기를 생략하면 서버가 정한 기본 분기이고, 비교 분기는 그 직전 분기다(이슈 #464).
    String currentPeriodCode,
    String previousPeriodCode,
    List<DistrictSalesAdministrationTopInfo> topSalesAdministrations
) {

}
