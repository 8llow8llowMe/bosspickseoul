package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.persistence.entity.AreaBoundaryEntity;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * 뷰포트 bbox 겹침 판정을 실제 스키마에 질의해 고정한다.
 *
 * <p>겹침 조건은 부등호 네 개가 서로 엇갈려 붙는다({@code maxLng >= minLng} 과 {@code minLng <= maxLng}).
 * 한쪽을 반대로 적거나 위도/경도 짝을 바꿔 적어도 컴파일은 통과하고, 넓은 줌에서는 결과가 어차피 많아
 * 화면상으로도 티가 나지 않는다. 경계에 딱 맞닿은 영역이 조용히 빠지거나 전혀 상관없는 영역이 섞여
 * 들어오는 것을 여기서 잡는다.
 *
 * <p>{@code areaType} 필터와 {@link Pageable} 상한도 함께 고정한다. 상한은 뷰포트 과다 판정
 * (MAP_010)의 근거이므로 실제로 SQL 에 걸리지 않으면 상한 자체가 무의미해진다.
 */
@DataJpaTest
class AreaBoundaryRepositoryTest {

    // 뷰포트: 경도 127.0~127.1, 위도 37.5~37.6
    private static final double VIEWPORT_MIN_LNG = 127.0;
    private static final double VIEWPORT_MIN_LAT = 37.5;
    private static final double VIEWPORT_MAX_LNG = 127.1;
    private static final double VIEWPORT_MAX_LAT = 37.6;

    @Autowired
    private AreaBoundaryRepository areaBoundaryRepository;

    // containsExactly 단정이 @DataJpaTest 의 롤백에만 기대지 않게 시작 상태를 명시적으로 비운다.
    @BeforeEach
    void setUp() {
        areaBoundaryRepository.deleteAll();
    }

    @Test
    @DisplayName("뷰포트에 완전히 들어간 영역은 조회된다")
    void containedAreaIsFound() {
        save(AreaType.COMMERCIAL, "CONTAINED", 127.02, 37.52, 127.05, 37.55);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).containsExactly("CONTAINED");
    }

    @Test
    @DisplayName("뷰포트와 일부만 겹치는 영역도 조회된다")
    void partiallyOverlappingAreaIsFound() {
        save(AreaType.COMMERCIAL, "PARTIAL", 127.05, 37.55, 127.30, 37.80);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).containsExactly("PARTIAL");
    }

    @Test
    @DisplayName("뷰포트 경계선에 정확히 맞닿은 영역도 조회된다")
    void touchingBoundaryAreaIsFound() {
        // 영역의 남서 모서리가 뷰포트의 북동 모서리와 한 점에서 만난다.
        // 부등호가 하나라도 등호를 잃으면 이 영역이 조용히 빠진다.
        save(AreaType.COMMERCIAL, "TOUCHING", VIEWPORT_MAX_LNG, VIEWPORT_MAX_LAT, 127.30, 37.80);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).containsExactly("TOUCHING");
    }

    @Test
    @DisplayName("뷰포트를 완전히 벗어난 영역은 조회되지 않는다")
    void disjointAreaIsExcluded() {
        save(AreaType.COMMERCIAL, "OUTSIDE", 127.50, 37.90, 127.60, 38.00);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).isEmpty();
    }

    @Test
    @DisplayName("위도만 겹치고 경도가 겹치지 않으면 조회되지 않는다")
    void latOnlyOverlapIsExcluded() {
        // 위도 축 부등호만 검사하고 경도 축을 빠뜨리면 이 영역이 결과에 섞여 들어온다.
        save(AreaType.COMMERCIAL, "LAT_ONLY", 128.00, 37.52, 128.10, 37.55);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).isEmpty();
    }

    @Test
    @DisplayName("경도만 겹치고 위도가 겹치지 않으면 조회되지 않는다")
    void lngOnlyOverlapIsExcluded() {
        save(AreaType.COMMERCIAL, "LNG_ONLY", 127.02, 38.50, 127.05, 38.60);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).isEmpty();
    }

    @Test
    @DisplayName("같은 뷰포트라도 요청한 영역 타입이 아니면 조회되지 않는다")
    void otherAreaTypeIsExcluded() {
        save(AreaType.COMMERCIAL, "COMMERCIAL_HIT", 127.02, 37.52, 127.05, 37.55);
        save(AreaType.ADMINISTRATION, "ADMINISTRATION_MISS", 127.02, 37.52, 127.05, 37.55);

        assertThat(codesInViewport(AreaType.COMMERCIAL)).containsExactly("COMMERCIAL_HIT");
        assertThat(codesInViewport(AreaType.ADMINISTRATION)).containsExactly("ADMINISTRATION_MISS");
    }

    @Test
    @DisplayName("Pageable 상한을 넘는 영역은 읽어 오지 않는다")
    void pageableLimitsRowCount() {
        save(AreaType.COMMERCIAL, "LIMIT_1", 127.01, 37.51, 127.02, 37.52);
        save(AreaType.COMMERCIAL, "LIMIT_2", 127.03, 37.53, 127.04, 37.54);
        save(AreaType.COMMERCIAL, "LIMIT_3", 127.05, 37.55, 127.06, 37.56);

        List<AreaBoundaryEntity> limited = areaBoundaryRepository.findAllByAreaTypeAndBoundingBox(
            AreaType.COMMERCIAL, VIEWPORT_MIN_LNG, VIEWPORT_MIN_LAT, VIEWPORT_MAX_LNG, VIEWPORT_MAX_LAT, PageRequest.of(0, 2)
        );

        assertThat(limited).hasSize(2);
    }

    private List<String> codesInViewport(AreaType areaType) {
        return areaBoundaryRepository.findAllByAreaTypeAndBoundingBox(
                areaType, VIEWPORT_MIN_LNG, VIEWPORT_MIN_LAT, VIEWPORT_MAX_LNG, VIEWPORT_MAX_LAT, Pageable.unpaged()
            )
            .stream()
            .map(AreaBoundaryEntity::getAreaCode)
            .toList();
    }

    private void save(AreaType areaType, String areaCode, double minLng, double minLat, double maxLng, double maxLat) {
        areaBoundaryRepository.save(AreaBoundaryEntity.builder()
            .areaType(areaType)
            .areaCode(areaCode)
            .areaName(areaCode)
            .centerLng((minLng + maxLng) / 2)
            .centerLat((minLat + maxLat) / 2)
            .boundaryGeoJson("[[%s,%s],[%s,%s]]".formatted(minLng, minLat, maxLng, maxLat))
            .bboxMinLng(minLng)
            .bboxMinLat(minLat)
            .bboxMaxLng(maxLng)
            .bboxMaxLat(maxLat)
            .build());
    }
}
