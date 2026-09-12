package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.AreaBoundaryRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.model.AreaBoundary;
import com.followfollowme.bosspickseoul.global.properties.MapViewportProperties;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 뷰포트 영역 상한이 실제로 읽는 양을 끊는지 확인한다.
 *
 * <p>상한 판정은 "상한 + 1 건을 읽어 넘치면 막는다" 는 전제 위에 있다. 포트에 넘기는 limit 을 그냥
 * {@code maxAreas} 로 적으면 정확히 상한만큼 차 있을 때와 상한을 넘었을 때가 구분되지 않아 MAP_010 이
 * 영원히 뜨지 않는다. 반대로 상한 바로 아래에서 잘못 막히면 정상 줌에서 화면이 빈다. 둘 다 컴파일로는
 * 잡히지 않고, 상한값이 커서 로컬 데이터로는 재현도 어렵다.
 *
 * <p>{@link MapViewportProperties} 는 mock 하지 않고 실제 record 로 넣는다. AreaType 별 상한 선택
 * 스위치가 엉뚱한 필드를 보고 있어도 mock 이면 드러나지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class MapQueryProcessorTest {

    private static final int MAX_DISTRICT = 3;
    private static final int MAX_ADMINISTRATION = 5;
    private static final int MAX_COMMERCIAL = 7;

    @Mock
    private AreaBoundaryRepositoryPort areaBoundaryRepositoryPort;

    private MapQueryProcessor mapQueryProcessor;

    @BeforeEach
    void setUp() {
        mapQueryProcessor = new MapQueryProcessor(
            areaBoundaryRepositoryPort,
            new ObjectMapper(),
            new MapViewportProperties(MAX_DISTRICT, MAX_ADMINISTRATION, MAX_COMMERCIAL)
        );
    }

    @Test
    @DisplayName("상한만큼 조회되면 정상 통과한다")
    void exactlyMaxAreasPasses() {
        stubAreas(MAX_COMMERCIAL);

        List<AreaBoundaryInfo> infos = mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, 127.0, 37.5, 127.1, 37.6);

        assertThat(infos).hasSize(MAX_COMMERCIAL);
        assertThat(infos.get(0).boundaryCoords()).containsExactly(List.of(127.0, 37.5));
    }

    @Test
    @DisplayName("상한을 한 건이라도 넘으면 MAP_010 으로 막는다")
    void oneOverMaxAreasIsRejected() {
        stubAreas(MAX_COMMERCIAL + 1);

        assertThatThrownBy(() -> mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, 127.0, 37.5, 127.1, 37.6))
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.VIEWPORT_TOO_MANY_AREAS);
    }

    @Test
    @DisplayName("넘침을 판정할 수 있도록 상한 + 1 건을 요청한다")
    void requestsOneMoreThanMaxAreas() {
        stubAreas(0);

        mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, 127.0, 37.5, 127.1, 37.6);

        verify(areaBoundaryRepositoryPort).findAllByAreaTypeAndBoundingBox(
            eq(AreaType.COMMERCIAL), eq(127.0), eq(37.5), eq(127.1), eq(37.6), eq(MAX_COMMERCIAL + 1)
        );
    }

    @Test
    @DisplayName("영역 타입마다 자기 상한을 쓴다")
    void eachAreaTypeUsesOwnLimit() {
        stubAreas(0);

        mapQueryProcessor.getAreaCoords(AreaType.DISTRICT, 127.0, 37.5, 127.1, 37.6);
        mapQueryProcessor.getAreaCoords(AreaType.ADMINISTRATION, 127.0, 37.5, 127.1, 37.6);

        verify(areaBoundaryRepositoryPort).findAllByAreaTypeAndBoundingBox(
            eq(AreaType.DISTRICT), anyDouble(), anyDouble(), anyDouble(), anyDouble(), eq(MAX_DISTRICT + 1)
        );
        verify(areaBoundaryRepositoryPort).findAllByAreaTypeAndBoundingBox(
            eq(AreaType.ADMINISTRATION), anyDouble(), anyDouble(), anyDouble(), anyDouble(), eq(MAX_ADMINISTRATION + 1)
        );
    }

    @Test
    @DisplayName("남서/북동이 뒤집힌 뷰포트는 조회 전에 MAP_006 으로 막는다")
    void invertedViewportIsRejectedBeforeQuery() {
        assertThatThrownBy(() -> mapQueryProcessor.getAreaCoords(AreaType.COMMERCIAL, 127.1, 37.5, 127.0, 37.6))
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.VIEWPORT_INVALID);
    }

    private void stubAreas(int count) {
        when(areaBoundaryRepositoryPort.findAllByAreaTypeAndBoundingBox(
            any(), anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyInt()
        )).thenReturn(areas(count));
    }

    private static List<AreaBoundary> areas(int count) {
        return IntStream.range(0, count)
            .mapToObj(index -> AreaBoundary.builder()
                .id(index + 1L)
                .areaType(AreaType.COMMERCIAL)
                .areaCode("CODE_" + index)
                .areaName("상권_" + index)
                .centerLng(127.05)
                .centerLat(37.55)
                .boundaryGeoJson("[[127.0,37.5]]")
                .bboxMinLng(127.0)
                .bboxMinLat(37.5)
                .bboxMaxLng(127.1)
                .bboxMaxLat(37.6)
                .build())
            .toList();
    }
}
