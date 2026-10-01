package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 소득 지표를 실제로 어디서 가져왔는지. 값이 없을 때도 어느 원천을 찾았고 왜 없는지 전하므로 원천 서비스는 이 블록을
 * 비우지 않는다.
 *
 * <p>소비 출처({@link CommercialExpenseProvenanceQueryResult})와 나눈 이유는 기준 단위가 달라서다. 소득 원천은 연 1회
 * 스냅샷이라 분기 코드가 아니라 기준일({@code referenceDate}, ISO 날짜 문자열)을 든다. 날짜 타입으로 바꾸지 않는 이유는
 * 프롬프트가 원천 서비스가 준 표기를 그대로 적기 때문이다. {@code disclaimer} 를 이 서비스가 다시 만들지 않는 이유는
 * 화면과 리포트가 같은 문장을 써야 하기 때문이다. (이슈 #415)
 */
@Builder
public record CommercialIncomeProvenanceQueryResult(
    CommercialIncomeScopeQueryResult scope,
    String scopeCode,
    String scopeName,
    String sourceId,
    String sourceLabel,
    String sourceUrl,
    String referenceDate,
    String disclaimer
) {

}
