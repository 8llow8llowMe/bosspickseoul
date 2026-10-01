package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialBenchmarkInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    String summary,
    CommercialSalesSummaryInfo salesSummary,
    CommercialIncomeSummaryInfo incomeSummary,
    List<String> benchmarkHighlights
) {

}
