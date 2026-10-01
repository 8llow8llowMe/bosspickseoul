package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 자치구 평균 소득(대체). 상권 단위 소득 원천이 끊겨 소속 자치구의 국민연금 지역가입자 신고 평균소득월액을 참고값으로 든다.
 *
 * <p>쓸 수 있는 자료가 없으면 {@code amount} 가 null 이다. 0 으로 채우면 "소득이 0원" 과 구별되지 않으므로 null 을 그대로
 * 통과시킨다. {@code provenance} 는 값이 없을 때도 사유를 담아 내려온다. (이슈 #415)
 */
@Builder
public record CommercialDistrictAverageIncomeQueryResult(
    Long amount,
    CommercialIncomeProvenanceQueryResult provenance
) {

}
