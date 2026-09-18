package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/summaries/income} 응답 본문의 wire 표현.
 *
 * <p>peer 의 {@code CommercialIncomeSummaryResponse} 와 {@code RegionalIncomeSummaryItem} 은 alias 없이
 * 컴포넌트 이름 그대로 내려온다. 그 이름을 아는 책임은 이 어댑터 계층 타입에만 있다.
 *
 * <p>{@code commercialProvenance} 는 상권 leg 에만 붙는다. 자치구·행정동 leg 는 원천이 살아 있어 대체하지
 * 않지만 상권 leg 에는 소속 행정동 총액이 들어올 수 있고, 그때 값이 이 상권의 실측이 아니라는 사실을
 * 프롬프트가 알아야 한다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialIncomeSummaryClientResponse(
    RegionalIncomeSummaryClientResponse district,
    RegionalIncomeSummaryClientResponse administration,
    RegionalIncomeSummaryClientResponse commercial,
    CommercialExpenseProvenanceClientResponse commercialProvenance
) {

}
