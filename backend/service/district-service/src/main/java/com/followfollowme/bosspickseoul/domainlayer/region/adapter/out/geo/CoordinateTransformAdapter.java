package com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.geo;

import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionException;
import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.CoordinateTransformPort;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.Wgs84Coordinate;
import jakarta.annotation.PostConstruct;
import org.geotools.api.referencing.crs.CoordinateReferenceSystem;
import org.geotools.api.referencing.operation.MathTransform;
import org.geotools.geometry.jts.JTS;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.geotools.referencing.CRS;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Component;

/**
 * geotools/JTS 를 쓰는 유일한 지점.
 *
 * <p>JTS 는 geotools 의 전이 의존이라 build.gradle 에 선언되어 있지 않다. 이 클래스 밖으로 새면
 * 선언되지 않은 라이브러리에 application 계층이 컴파일 의존하게 되므로 좌표는 {@link Wgs84Coordinate} 로 바꿔 내보낸다.
 */
@Component
public class CoordinateTransformAdapter implements CoordinateTransformPort {

    private static final String SOURCE_EPSG = "EPSG:5181";
    private static final String TARGET_EPSG = "EPSG:4326";

    private final GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();
    private MathTransform transform;

    @PostConstruct
    void init() {
        try {
            CoordinateReferenceSystem sourceCRS = CRS.decode(SOURCE_EPSG);
            CoordinateReferenceSystem targetCRS = CRS.decode(TARGET_EPSG);
            this.transform = CRS.findMathTransform(sourceCRS, targetCRS, true);
        } catch (Exception e) {
            // 기동 시점 실패는 요청 처리 예외가 아니라 애플리케이션 구성 오류이므로 IllegalState로 던져 기동을 중단시킨다.
            throw new IllegalStateException("좌표 변환기 초기화 실패", e);
        }
    }

    @Override
    public Wgs84Coordinate toWgs84(double x, double y) {
        try {
            // 인자는 (easting, northing) 순서로 들어오는데, EPSG:5181 의 CRS 축 순서는
            // AXIS["Northing", NORTH] · AXIS["Easting", EAST] 다. geotools 는 Coordinate 의 첫 ordinate 를
            // 원천 CRS 의 첫 축(= northing)으로 읽으므로 뒤집어 넣는다.
            Coordinate coordinate = new Coordinate(y, x);
            Geometry point = geometryFactory.createPoint(coordinate);
            Point transformed = (Point) JTS.transform(point, transform);
            // CRS.decode("EPSG:4326") 은 EPSG 정의대로 (위도, 경도) 축 순서를 유지한다.
            // 그래서 getX() 가 위도, getY() 가 경도다. longitudeFirst 를 켜면 이 전제가 뒤집히므로 바꾸지 않는다.
            return new Wgs84Coordinate(transformed.getX(), transformed.getY());
        } catch (Exception e) {
            throw new RegionException(RegionErrorCode.COORDINATE_TRANSFORM_FAILED, e);
        }
    }
}
