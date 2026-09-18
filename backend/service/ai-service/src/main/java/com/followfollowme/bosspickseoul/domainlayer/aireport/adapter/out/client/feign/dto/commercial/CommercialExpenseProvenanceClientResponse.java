package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 소비 지표 출처 메타의 wire 표현. peer 의 {@code CommercialExpenseProvenanceItem} 과 같은 모양이다.
 *
 * <p>값이 상권 것인지 소속 행정동을 빌려온 것인지, 아니면 아예 없는지를 이 블록이 말해 준다. 값이 없을 때도
 * 어느 원천이 왜 끊겼는지 전하므로 peer 는 이 블록을 비우지 않는다. {@code disclaimer} 는 대체·중단일 때만
 * 채워지고 상권 네이티브에서는 null 이다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialExpenseProvenanceClientResponse(
    CommercialExpenseScopeClientResponse scope,
    String scopeCode,
    String scopeName,
    String sourceId,
    String sourceLabel,
    String sourceUrl,
    String effectivePeriodCode,
    String disclaimer
) {

}
