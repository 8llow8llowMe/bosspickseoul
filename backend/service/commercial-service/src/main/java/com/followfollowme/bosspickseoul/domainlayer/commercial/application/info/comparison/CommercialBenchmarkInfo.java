package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialIncomeSummaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary.CommercialSalesSummaryInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialBenchmarkInfo(
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
