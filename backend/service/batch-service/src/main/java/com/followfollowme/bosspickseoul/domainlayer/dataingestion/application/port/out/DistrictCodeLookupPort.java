package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import java.util.Map;

/**
 * 공간 스냅샷의 자치구 이름 → 코드. 이름으로만 오는 원천(국민연금 시군구)을 코드에 붙일 때 쓴다.
 *
 * <p>25행 규모라 run 시작 시 한 번 통째로 읽는다. 행마다 조회하면 원천 행 수만큼 왕복이 생긴다.
 */
public interface DistrictCodeLookupPort {

    /** key 는 {@code area_name}({@code 종로구}), value 는 {@code area_code}. READY 가 아닌 버전이면 빈 맵이다. */
    Map<String, String> districtCodesByName(String spatialVersion);
}
