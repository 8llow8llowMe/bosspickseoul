package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/population} 응답 본문의 wire 표현.
 *
 * <p><b>알려진 결함(다음 커밋에서 고친다).</b> {@code totalResidentPopulationCount} 는 peer 의
 * {@code CommercialResidentPopulationResponse} 에 존재하지 않는 키다(peer 는 byAgeItem / malePercentage /
 * femalePercentage 만 내려준다). primitive long 이라 매칭에 실패해도 예외 없이 조용히 0 이 된다.
 * 이번 변경은 wire 분리만 다루므로 현재 동작(0)을 그대로 옮겼다. 존재하지 않는 키라는 사실이 이제 wire 타입에
 * 드러나므로, 다음 커밋에서 이 컴포넌트를 지우고 {@code byAge.totalResidentPopulation()} 을 쓰도록 고친다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialResidentPopulationClientResponse(
    @JsonProperty("byAgeItem") CommercialResidentPopulationByAgeClientResponse byAge,
    long totalResidentPopulationCount
) {

}
