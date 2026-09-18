package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 소비 값을 가져온 영역 단위의 wire 표현. peer 가 {@code CodeNameDescriptionMetadata} 로 내려보내는
 * {@code {code, name, description}} 객체다.
 *
 * <p>{@code code} 는 {@code COMMERCIAL}(상권 네이티브) / {@code ADMINISTRATION_PROXY}(행정동 대체) /
 * {@code UNAVAILABLE}(제공 없음) 셋이다. 공통 모듈의 응답 DTO 타입을 역직렬화 대상으로 끌어다 쓰지 않고
 * wire 타입을 따로 두는 이유는, peer 응답 모양을 아는 책임을 이 어댑터 계층 안에 가두기 위해서다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialExpenseScopeClientResponse(
    String code,
    String name,
    String description
) {

}
