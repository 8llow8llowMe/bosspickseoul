package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/districts/{districtCode}?currentPeriodCode=...} 응답 본문의 wire 표현.
 *
 * <p>commercial-service 의 {@code DistrictDetailResponse} 와 필드명·구조가 1:1 이다. alias 는 없지만
 * 이름이 같다는 사실 자체가 계약이고, 그 계약을 아는 책임은 이 어댑터 계층 타입에만 있다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictDetailClientResponse(
    DistrictChangeIndicatorClientResponse changeIndicator,
    DistrictFootTrafficDetailClientResponse footTraffic,
    DistrictStoreDetailClientResponse store,
    DistrictSalesDetailClientResponse sales
) {

}
