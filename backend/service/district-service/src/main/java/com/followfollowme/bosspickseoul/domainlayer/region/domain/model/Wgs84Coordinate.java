package com.followfollowme.bosspickseoul.domainlayer.region.domain.model;

/**
 * WGS84(EPSG:4326) 좌표.
 *
 * <p>축 순서를 필드 이름으로 못 박는다. 예전에는 out-port 가 JTS {@code Point} 를 그대로 돌려줬고,
 * 호출자가 {@code getX()} 를 경도로 읽어도 컴파일이 통과했다. JTS 는 어느 build.gradle 에도
 * 선언되지 않은 geotools 의 전이 의존이라, application 계층이 선언되지 않은 좌표 라이브러리에
 * 컴파일 의존하던 문제도 함께 사라진다.
 */
public record Wgs84Coordinate(double lat, double lng) {

}
