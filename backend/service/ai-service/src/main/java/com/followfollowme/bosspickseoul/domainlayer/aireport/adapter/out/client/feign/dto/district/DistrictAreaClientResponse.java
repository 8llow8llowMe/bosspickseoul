package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/regions/districts/{districtCode}} 응답 본문의 wire 표현.
 *
 * <p>나머지 District wire DTO 는 commercial-service 가 내려보내지만 이것만 district-service 의
 * region 컨텍스트({@code DistrictAreaResponse})에서 온다. peer 는 다르지만 자치구 영역이라는 같은
 * 도메인 모양이라 이 패키지에 함께 둔다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictAreaClientResponse(String districtCode, String districtName) {

}
