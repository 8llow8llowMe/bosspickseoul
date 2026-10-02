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
    // 업종별 점포당 평균 매출과 자치구·행정동 대비 지수(이슈 #485). 매출 요약이 성립하면 항상 채워지고, 결측은 안쪽 필드만 null 이다.
    CommercialSalesPerStoreSummaryInfo salesPerStore,
    List<String> benchmarkHighlights
) {

}
