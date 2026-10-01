package com.followfollowme.bosspickseoul.domainlayer.administration.application.info;

import lombok.Builder;

@Builder
public record AdministrationDetailInfo(
    String administrationCode,
    String administrationName,
    // 실제로 조회한 현재·비교 분기. 요청이 현재 분기를 생략하면 서버가 정한 기본 분기이고, 비교 분기는 그 직전 분기다(이슈 #464).
    String currentPeriodCode,
    String previousPeriodCode,
    AdministrationSalesDetailInfo sales,
    AdministrationStoreDetailInfo store,
    AdministrationIncomeDetailInfo income
) {

}
