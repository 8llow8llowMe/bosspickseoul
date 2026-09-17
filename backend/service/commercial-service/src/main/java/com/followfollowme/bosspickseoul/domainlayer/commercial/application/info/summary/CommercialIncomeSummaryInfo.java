package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income.CommercialExpenseProvenanceInfo;
import lombok.Builder;

@Builder
public record CommercialIncomeSummaryInfo(
    RegionalIncomeSummaryInfo district,
    RegionalIncomeSummaryInfo administration,
    RegionalIncomeSummaryInfo commercial,

    // 상권 leg 의 출처. 자치구·행정동 leg 는 원천이 살아 있어 대체하지 않으므로 상권 leg 에만 붙는다. (이슈 #415)
    CommercialExpenseProvenanceInfo commercialProvenance
) {

}
