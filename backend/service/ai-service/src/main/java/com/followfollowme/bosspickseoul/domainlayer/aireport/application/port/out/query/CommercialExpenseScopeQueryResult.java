package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 소비 값을 가져온 영역 단위. {@code code} 는 {@code COMMERCIAL}(상권 네이티브) /
 * {@code ADMINISTRATION_PROXY}(행정동 대체) / {@code UNAVAILABLE}(제공 없음) 셋이다.
 *
 * <p>여기서 enum 으로 좁히지 않는 이유는, 원천 서비스가 사다리에 단계를 하나 더 붙였을 때 이 서비스가
 * 역직렬화 단계에서 죽지 않게 하기 위해서다. 프롬프트는 화면 문구({@code name})만 쓴다. (이슈 #415)
 */
@Builder
public record CommercialExpenseScopeQueryResult(
    String code,
    String name,
    String description
) {

}
