package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 소득 값을 가져온 영역 단위. {@code code} 는 {@code DISTRICT_PROXY}(자치구 대체) / {@code UNAVAILABLE}(제공 없음) 둘이다.
 *
 * <p>여기서 enum 으로 좁히지 않는 이유는 소비 스코프와 같다 — 원천 서비스가 단계를 하나 더 붙였을 때 이 서비스가
 * 역직렬화 단계에서 죽지 않게 하기 위해서다. (이슈 #415)
 */
@Builder
public record CommercialIncomeScopeQueryResult(
    String code,
    String name,
    String description
) {

}
