package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/population} 응답 본문의 wire 표현.
 *
 * <p>peer 의 {@code CommercialResidentPopulationResponse} 는 byAgeItem / malePercentage / femalePercentage
 * 3개뿐이다. 총 상주인구는 별도 키가 아니라 {@code byAgeItem.totalResidentPopulation} 으로 내려온다.
 * 예전에는 이 타입이 peer 에 없는 {@code totalResidentPopulationCount} 컴포넌트를 들고 있었고,
 * primitive long 이라 매칭 실패가 예외 없이 0 이 되어 모든 상권 AI 리포트가 "총 상주인구 0" 을 근거로 받았다.
 * wire 타입은 peer 응답 모양만 그대로 표현한다 — 없는 키는 두지 않는다.
 * QueryResult 의 {@code totalResidentPopulationCount} 는 {@link CommercialAnalysisWireMapper} 가
 * {@code byAge.totalResidentPopulation()} 에서 파생시킨다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialResidentPopulationClientResponse(
    @JsonProperty("byAgeItem") CommercialResidentPopulationByAgeClientResponse byAge
) {

}
