package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary;

import lombok.Builder;

@Builder
public record CommercialSalesSummaryInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    RegionalSalesSummaryInfo district,
    RegionalSalesSummaryInfo administration,
    RegionalSalesSummaryInfo commercial
) {

}
