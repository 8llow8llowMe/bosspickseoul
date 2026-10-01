package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 소득 값을 가져온 영역 단위의 wire 표현. peer 가 {@code CodeNameDescriptionMetadata} 로 내려보내는
 * {@code {code, name, description}} 객체다.
 *
 * <p>{@code code} 는 {@code DISTRICT_PROXY}(자치구 대체) / {@code UNAVAILABLE}(제공 없음) 둘이다. 소비 스코프
 * ({@link CommercialExpenseScopeClientResponse})와 모양은 같지만 코드 집합이 달라 타입을 나눈다. 한 타입으로 합치면
 * javadoc 의 코드 목록이 어느 지표 것인지 흐려진다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialIncomeScopeClientResponse(
    String code,
    String name,
    String description
) {

}
