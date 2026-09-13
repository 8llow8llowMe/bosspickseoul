package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/regions/districts/{districtCode}/administrations/{administrationCode}/commercials}
 * 응답 목록 항목의 wire 표현.
 *
 * <p>peer 는 district-service 이고 대응 타입은 {@code CommercialAreaResponse} 다. peer 는 항목마다
 * 분류 코드·분류명·중심 좌표까지 6개 필드를 내려보내지만 ai-report 는 코드와 이름만 쓴다. 나머지 4개는
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)} 로 버린다. 지금 쓰지 않는 필드를 wire DTO 에
 * 미리 넣지 않는 이유는, 쓰지 않는 값이 QueryResult 까지 흘러가면 out-port 계약이 커지기 때문이다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AdministrationCommercialClientResponse(
    String commercialCode,
    String commercialName
) {

}
