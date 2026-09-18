package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 지역 단위별 지출 요약. 해당 분기에 그 단위 행이 없으면 단위별로 null 이 온다. (이슈 #413)
 *
 * <p>{@code commercialProvenance} 는 상권 leg 에만 붙는다. 자치구·행정동 leg 는 원천이 살아 있어 대체하지
 * 않지만, 상권 leg 에는 소속 행정동 총액이 들어올 수 있다. (이슈 #415)
 */
@Builder
public record CommercialIncomeSummaryQueryResult(
    RegionalIncomeSummaryQueryResult district,
    RegionalIncomeSummaryQueryResult administration,
    RegionalIncomeSummaryQueryResult commercial,
    CommercialExpenseProvenanceQueryResult commercialProvenance
) {

}
