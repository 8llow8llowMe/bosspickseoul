package com.followfollowme.nowdoboss.domainlayer.region.adapter.out.geo;

import com.followfollowme.nowdoboss.domainlayer.region.application.exception.RegionErrorCode;
import com.followfollowme.nowdoboss.domainlayer.region.application.exception.RegionException;
import com.followfollowme.nowdoboss.domainlayer.region.application.port.out.CoordinateTransformPort;
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
    public Point toWgs84(double x, double y) {
        try {
            Coordinate coordinate = new Coordinate(y, x);
            Geometry point = geometryFactory.createPoint(coordinate);
            return (Point) JTS.transform(point, transform);
        } catch (Exception e) {
            throw new RegionException(RegionErrorCode.COORDINATE_TRANSFORM_FAILED, e);
        }
    }
}
