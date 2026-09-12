package com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query;

import lombok.Builder;

/**
 * 지역명으로 찾은 지역 코드 조회 결과.
 *
 * <p>조회 종류에 따라 채워지는 필드가 다르다. 자치구 조회는 자치구 2개, 행정동 조회는 자치구/행정동 4개,
 * 상권 조회는 6개 필드가 모두 채워지고 나머지는 {@code null} 이다.
 */
@Builder
public record RegionCodeLookupQueryResult(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    String commercialCode,
    String commercialName
) {

}
