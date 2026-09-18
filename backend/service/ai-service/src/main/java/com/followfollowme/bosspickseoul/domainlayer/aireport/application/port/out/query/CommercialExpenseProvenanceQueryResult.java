package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 소비 지표를 실제로 어디서 가져왔는지. 값이 없을 때도 어느 원천이 왜 끊겼는지 전하므로 원천 서비스는
 * 이 블록을 비우지 않는다.
 *
 * <p>{@code disclaimer} 는 대체·중단일 때만 채워지고 상권 네이티브에서는 null 이다. 이 문장을 이 서비스가
 * 다시 만들지 않는 이유는 화면과 리포트가 같은 문장을 써야 하기 때문이다. (이슈 #415)
 */
@Builder
public record CommercialExpenseProvenanceQueryResult(
    CommercialExpenseScopeQueryResult scope,
    String scopeCode,
    String scopeName,
    String sourceId,
    String sourceLabel,
    String sourceUrl,
    String effectivePeriodCode,
    String disclaimer
) {

}
