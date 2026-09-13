package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.regional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/regions/commercials/{commercialCode}/administration} 응답 본문의 wire 표현.
 *
 * <p>peer 의 {@code CommercialAdministrationAreaResponse} 는 alias 없이 컴포넌트 이름 그대로 내려온다.
 * 그 이름을 아는 책임은 이 어댑터 계층 타입에만 있고, {@code application/port/out/query} 의
 * {@code CommercialAdministrationQueryResult} 는 알지 않는다. peer 가 응답 필드명을 바꾸면 여기만 고치면 된다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialAdministrationClientResponse(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
