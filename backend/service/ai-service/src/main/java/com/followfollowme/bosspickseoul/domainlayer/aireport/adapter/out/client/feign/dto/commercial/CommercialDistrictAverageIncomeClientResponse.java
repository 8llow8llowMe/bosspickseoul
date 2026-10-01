package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 자치구 평균 소득(대체)의 wire 표현. peer 의 {@code CommercialDistrictAverageIncomeItem} 과 같은 모양이다.
 *
 * <p>상권 단위 소득 원천이 끊겨 소속 자치구의 국민연금 지역가입자 신고 평균소득월액을 참고값으로 싣는다. 쓸 수 있는 자료가
 * 없으면 {@code amount} 만 null 이고 {@code provenance} 는 사유를 담아 항상 내려온다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialDistrictAverageIncomeClientResponse(
    Long amount,
    CommercialIncomeProvenanceClientResponse provenance
) {

}
