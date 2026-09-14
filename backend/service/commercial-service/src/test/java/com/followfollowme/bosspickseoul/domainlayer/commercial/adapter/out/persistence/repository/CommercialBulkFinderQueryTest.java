package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

/**
 * 히트맵 벌크 조회 6종의 파생 쿼리가 실제 스키마에 대해 성립하는지 확인한다.
 *
 * <p>파생 쿼리는 메서드 <b>이름</b>이 계약이다. 프로퍼티명을 하나 틀리면 컴파일은 통과하고
 * 리포지터리 빈을 만드는 시점에 터진다 — 즉 단위 테스트로는 안 잡히고 서비스 기동이 죽는다.
 * 이 슬라이스는 여섯 리포지터리를 실제로 올리고 각 메서드를 한 번씩 실행해 그 경로를 막는다.
 *
 * <p><b>덮지 않는 것</b>: 필터 의미(어떤 행이 걸러지는지)는 여기서 보지 않는다. 여섯 엔티티 모두
 * non-null 컬럼이 많아 픽스처가 본문보다 길어지고, {@code spatialVersion} · {@code periodCode} ·
 * {@code commercialCode} 조건은 같은 리포지터리의 기존 단건 메서드가 이미 같은 모양으로 쓰고 있다.
 * 점수 조립 쪽 동작은 {@code CommercialHeatmapQueryProcessorTest} 가 본다.
 */
@DataJpaTest
class CommercialBulkFinderQueryTest {

    private static final String PERIOD_CODE = "20233";
    private static final String SERVICE_CODE = "CS100001";
    private static final String SPATIAL_VERSION = "20233";
    private static final List<String> COMMERCIAL_CODES = List.of("3110001", "3110002");

    @Autowired
    private SalesCommercialRepository salesCommercialRepository;

    @Autowired
    private FootTrafficCommercialRepository footTrafficCommercialRepository;

    @Autowired
    private StoreCommercialRepository storeCommercialRepository;

    @Autowired
    private PopulationCommercialRepository populationCommercialRepository;

    @Autowired
    private IncomeCommercialRepository incomeCommercialRepository;

    @Autowired
    private FacilityCommercialRepository facilityCommercialRepository;

    @Test
    @DisplayName("벌크 조회 6종이 실제 스키마에 질의된다")
    void bulkFindersRunAgainstRealSchema() {
        assertThat(salesCommercialRepository.findAllByPeriodCodeAndServiceCodeAndSpatialVersionAndCommercialCodeIn(
            PERIOD_CODE, SERVICE_CODE, SPATIAL_VERSION, COMMERCIAL_CODES)).isEmpty();

        assertThat(footTrafficCommercialRepository.findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
            PERIOD_CODE, SPATIAL_VERSION, COMMERCIAL_CODES)).isEmpty();

        assertThat(storeCommercialRepository.findAllByPeriodCodeAndServiceCodeAndSpatialVersionAndCommercialCodeIn(
            PERIOD_CODE, SERVICE_CODE, SPATIAL_VERSION, COMMERCIAL_CODES)).isEmpty();

        assertThat(populationCommercialRepository.findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
            PERIOD_CODE, SPATIAL_VERSION, COMMERCIAL_CODES)).isEmpty();

        assertThat(incomeCommercialRepository.findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
            PERIOD_CODE, SPATIAL_VERSION, COMMERCIAL_CODES)).isEmpty();

        assertThat(facilityCommercialRepository.findAllByPeriodCodeAndSpatialVersionAndCommercialCodeIn(
            PERIOD_CODE, SPATIAL_VERSION, COMMERCIAL_CODES)).isEmpty();
    }
}
