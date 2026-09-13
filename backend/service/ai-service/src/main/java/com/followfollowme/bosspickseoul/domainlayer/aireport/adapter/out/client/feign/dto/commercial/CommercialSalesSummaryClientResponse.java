package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/summaries/sales} 응답 본문의 wire 표현.
 *
 * <p>peer 의 {@code CommercialSalesSummaryResponse} 와 {@code RegionalSalesSummaryItem} 은 alias 없이
 * 컴포넌트 이름 그대로 내려온다. 그 이름을 아는 책임은 이 어댑터 계층 타입에만 있다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialSalesSummaryClientResponse(
    RegionalSalesSummaryClientResponse district,
    RegionalSalesSummaryClientResponse administration,
    RegionalSalesSummaryClientResponse commercial
) {

}
