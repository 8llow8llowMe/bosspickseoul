package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 소득 지표 출처 메타의 wire 표현. peer 의 {@code CommercialIncomeProvenanceItem} 과 같은 모양이다.
 *
 * <p>소비 출처({@link CommercialExpenseProvenanceClientResponse})와 나눈 이유는 원천과 기준 단위가 달라서다. 소비는 서울
 * 열린데이터광장 분기 원천이라 기준이 분기 코드({@code effectivePeriodCode})이고, 소득은 국민연금 연 1회 파일이라 기준이
 * ISO 날짜({@code referenceDate}, 예: {@code 2024-12-31})다. {@code scopeCode}·{@code scopeName}·{@code referenceDate} 는
 * 값이 없을 때(scope {@code UNAVAILABLE}) null 이고, {@code disclaimer} 는 두 스코프 모두 채워진다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialIncomeProvenanceClientResponse(
    CommercialIncomeScopeClientResponse scope,
    String scopeCode,
    String scopeName,
    String sourceId,
    String sourceLabel,
    String sourceUrl,
    String referenceDate,
    String disclaimer
) {

}
