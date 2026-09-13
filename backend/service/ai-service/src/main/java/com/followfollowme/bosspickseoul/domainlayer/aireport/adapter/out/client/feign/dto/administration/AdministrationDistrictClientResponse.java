package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/regions/administrations/{administrationCode}} 응답 본문의 wire 표현.
 *
 * <p>peer 는 district-service 이고 대응 타입은 {@code AdministrationDistrictAreaResponse} 다.
 * 같은 Administration 계열이지만 상세 조회와 peer 가 다르다는 점에 주의한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AdministrationDistrictClientResponse(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
