package com.followfollowme.bosspickseoul.domainlayer.region.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.Wgs84Coordinate;

public interface CoordinateTransformPort {

    /**
     * 상권 원천 좌표(EPSG:5181)를 WGS84 로 변환한다.
     *
     * <p>두 인자가 모두 {@code double} 이라 바꿔 넣어도 컴파일이 통과하고, 서울은 easting 20만대 ·
     * northing 45만대라 자릿수로도 구분되지 않는다. 그래서 축 의미를 여기에 적어 둔다. 이 전제는
     * {@code CoordinateTransformAdapterTest} 가 EPSG:5181 의 투영 원점을 통제점으로 삼아 고정한다.
     *
     * @param x commercial_region_mapping.x — EPSG:5181 의 동쪽(easting) 값
     * @param y commercial_region_mapping.y — EPSG:5181 의 북쪽(northing) 값
     */
    Wgs84Coordinate toWgs84(double x, double y);
}
