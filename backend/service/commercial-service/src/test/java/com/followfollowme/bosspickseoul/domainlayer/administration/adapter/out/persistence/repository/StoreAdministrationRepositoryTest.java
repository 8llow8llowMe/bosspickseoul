package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.global.config.CommercialDataJpaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

/**
 * 상권 벤치마크의 점포당 매출 지수(이슈 #485)가 행정동 한 업종의 점포 수를 읽는 파생 쿼리를 실제 스키마에서 확인한다.
 *
 * <p>파생 쿼리는 메서드 이름이 계약이라 프로퍼티명 하나가 틀려도 컴파일은 통과하고 리포지터리 빈을 만들 때 터진다. 그리고 네
 * 조건(분기·행정동·업종·공간 스냅샷)이 모두 걸리는지는 DB 가 정하므로 목으로는 확인할 수 없다. 조건 하나만 다른 행을 하나씩
 * 깔아 두고 정확히 한 행만 고르는지 본다. 공간 스냅샷은 env({@code DATASET_SPATIAL_VERSION})와 무관한 명시 값을 쓴다.
 */
@CommercialDataJpaTest
class StoreAdministrationRepositoryTest {

    private static final String PERIOD = "20261";
    private static final String ADMINISTRATION = "11350600";
    private static final String COFFEE = "CS100010";
    private static final String SNAPSHOT = "test-snapshot-a";

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private StoreAdministrationRepository storeAdministrationRepository;

    @BeforeEach
    void seed() {
        persist(PERIOD, ADMINISTRATION, COFFEE, SNAPSHOT, 102L);
        // 조건 하나씩만 다른 행. 어느 조건이 빠져도 이 중 하나가 섞여 유니크 결과가 깨지거나 값이 바뀐다.
        persist("20254", ADMINISTRATION, COFFEE, SNAPSHOT, 1L);
        persist(PERIOD, "11350595", COFFEE, SNAPSHOT, 2L);
        persist(PERIOD, ADMINISTRATION, "CS100001", SNAPSHOT, 3L);
        persist(PERIOD, ADMINISTRATION, COFFEE, "test-snapshot-b", 4L);
    }

    @Test
    @DisplayName("분기·행정동·업종·공간 스냅샷이 모두 같은 한 행만 고른다")
    void findsTheOneRowMatchingAllFourConditions() {
        assertThat(storeAdministrationRepository.findByPeriodCodeAndAdministrationCodeAndServiceCodeAndSpatialVersion(
            PERIOD, ADMINISTRATION, COFFEE, SNAPSHOT))
            .hasValueSatisfying(entity -> {
                assertThat(entity.getSimilarStoreCount()).isEqualTo(102L);
                assertThat(entity.getAdministrationName()).isEqualTo("공릉2동");
                assertThat(entity.getServiceName()).isEqualTo("커피-음료");
            });
    }

    @Test
    @DisplayName("그 업종의 점포 행이 없으면 다른 업종이나 다른 스냅샷 행을 끌어오지 않고 비운다")
    void returnsEmptyWhenTheServiceHasNoStoreRow() {
        assertThat(storeAdministrationRepository.findByPeriodCodeAndAdministrationCodeAndServiceCodeAndSpatialVersion(
            PERIOD, ADMINISTRATION, "CS200001", SNAPSHOT)).isEmpty();
        assertThat(storeAdministrationRepository.findByPeriodCodeAndAdministrationCodeAndServiceCodeAndSpatialVersion(
            PERIOD, ADMINISTRATION, COFFEE, "missing-snapshot")).isEmpty();
    }

    private void persist(String periodCode, String administrationCode, String serviceCode, String spatialVersion, long similarStoreCount) {
        entityManager.persistAndFlush(StoreAdministrationEntity.builder()
            .periodCode(periodCode)
            .spatialVersion(spatialVersion)
            .administrationCode(administrationCode)
            .administrationName("공릉2동")
            .serviceCode(serviceCode)
            .serviceName("커피-음료")
            .serviceType(ServiceType.RESTAURANT)
            .totalStoreCount(similarStoreCount)
            .similarStoreCount(similarStoreCount)
            .openedStoreCount(0L)
            .closedStoreCount(0L)
            .franchiseStoreCount(0L)
            .openingRate(0.0)
            .closureRate(0.0)
            .build());
    }
}
