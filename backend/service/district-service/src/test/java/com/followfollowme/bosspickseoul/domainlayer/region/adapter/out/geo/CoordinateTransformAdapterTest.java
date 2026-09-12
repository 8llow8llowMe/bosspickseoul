package com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.geo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.Wgs84Coordinate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * EPSG:5181 → WGS84 변환의 축 순서 전제를 고정한다.
 *
 * <p>이 변환에는 축이 뒤집힐 지점이 세 군데 있다. 원천 컬럼 {@code (x, y)}, JTS {@code Coordinate} 의
 * 두 ordinate, 그리고 출력 {@code Point} 의 {@code getX()}/{@code getY()} 다. 셋 다 그냥
 * {@code double} 두 개라 어느 쪽을 바꿔 적어도 컴파일은 통과한다. 게다가 서울은 위도 37 · 경도 127 로
 * 둘 다 그럴듯한 숫자라, 값을 눈으로 훑는 것만으로는 걸러지지 않는다.
 *
 * <p>기대값은 어댑터 출력이 아니라 CRS 정의에서 끌어온다. 어댑터가 내놓은 값을 그대로 기대값으로 쓰면
 * 축이 뒤집힌 채로도 통과하는 순환 검증이 된다. {@code CRS.decode("EPSG:5181").toWKT()} 가 알려주는
 * 투영 파라미터는 다음과 같다(KGD2002 / Central Belt).
 *
 * <pre>
 *   PARAMETER["central_meridian", 127.0]
 *   PARAMETER["latitude_of_origin", 38.0]
 *   PARAMETER["scale_factor", 1.0]
 *   PARAMETER["false_easting", 200000.0]
 *   PARAMETER["false_northing", 500000.0]
 *   AXIS["Northing", NORTH], AXIS["Easting", EAST]
 * </pre>
 *
 * <p>투영 원점은 정의상 easting = false_easting, northing = false_northing 인 지점이고 그 지리 좌표는
 * (latitude_of_origin, central_meridian) = (38.0, 127.0) 이다. 이 통제점을 넣어 보면 포트 인자의 의미가
 * 드러난다. <b>{@code toWgs84} 의 첫 인자가 easting, 둘째 인자가 northing 이다.</b> 반대로 넣으면
 * 위도 35.25 · 경도 130.30(동해 한가운데)이 나와 즉시 깨진다 — 그게 이 테스트의 목적이다.
 */
class CoordinateTransformAdapterTest {

    private static final double FALSE_EASTING = 200000.0;
    private static final double FALSE_NORTHING = 500000.0;
    private static final double LATITUDE_OF_ORIGIN = 38.0;
    private static final double CENTRAL_MERIDIAN = 127.0;

    private CoordinateTransformAdapter coordinateTransformAdapter;

    @BeforeEach
    void setUp() {
        coordinateTransformAdapter = new CoordinateTransformAdapter();
        coordinateTransformAdapter.init();
    }

    @Test
    @DisplayName("투영 원점을 넣으면 정의된 위도 원점과 중앙 자오선이 그대로 나온다")
    void projectionOriginMapsToDefinedLatitudeAndLongitude() {
        Wgs84Coordinate result = coordinateTransformAdapter.toWgs84(FALSE_EASTING, FALSE_NORTHING);

        assertThat(result.lat()).isCloseTo(LATITUDE_OF_ORIGIN, within(0.01));
        assertThat(result.lng()).isCloseTo(CENTRAL_MERIDIAN, within(0.01));
    }

    @Test
    @DisplayName("첫 인자만 키우면 경도가, 둘째 인자만 키우면 위도가 커진다")
    void firstArgumentIsEastingAndSecondArgumentIsNorthing() {
        Wgs84Coordinate east = coordinateTransformAdapter.toWgs84(FALSE_EASTING + 100_000, FALSE_NORTHING);
        Wgs84Coordinate north = coordinateTransformAdapter.toWgs84(FALSE_EASTING, FALSE_NORTHING + 100_000);

        assertThat(east.lng()).isGreaterThan(CENTRAL_MERIDIAN);
        assertThat(east.lat()).isCloseTo(LATITUDE_OF_ORIGIN, within(0.1));

        assertThat(north.lat()).isGreaterThan(LATITUDE_OF_ORIGIN);
        assertThat(north.lng()).isCloseTo(CENTRAL_MERIDIAN, within(0.01));
    }

    @Test
    @DisplayName("서울 상권 원천 좌표를 넣으면 서울 범위의 위경도가 나온다")
    void seoulSourceCoordinateStaysInSeoulRange() {
        // 서울 상권 원천 좌표의 실제 자릿수(x 약 20만대, y 약 45만대)를 그대로 쓴다.
        // 축이 뒤집히면 위도 35.29 · 경도 129.77 이 나와 이 범위를 즉시 벗어난다.
        Wgs84Coordinate result = coordinateTransformAdapter.toWgs84(202_459, 451_792);

        assertThat(result.lat()).isBetween(37.4, 37.7);
        assertThat(result.lng()).isBetween(126.7, 127.2);
    }
}
