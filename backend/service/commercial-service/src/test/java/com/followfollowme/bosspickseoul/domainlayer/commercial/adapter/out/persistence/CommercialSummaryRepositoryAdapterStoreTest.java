package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.mapper.StoreAdministrationMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.StoreCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.StoreCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity.StoreDistrictEntity;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.StoreDistrictMapper;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 벤치마크 점포 조회 세 단위가 각자 자기 점포 테이블에 이어지고, 배포 설정의 공간 스냅샷으로 거르며, 점포 수 세 컬럼을 그대로
 * 옮기는지 못 박는다(이슈 #485). 세 메서드는 모양이 같아 리포지터리를 바꿔 적어도 컴파일된다. 그러면 행정동 점포 수 자리에 자치구
 * 값이 들어가 지수가 조용히 틀린다. 매퍼는 생성된 구현을 그대로 쓴다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialSummaryRepositoryAdapterStoreTest {

    private static final String SNAPSHOT = "test-snapshot";
    private static final String PERIOD = "20261";
    private static final String COFFEE = "CS100010";

    @Mock
    private StoreDistrictRepository storeDistrictRepository;

    @Mock
    private StoreAdministrationRepository storeAdministrationRepository;

    @Mock
    private StoreCommercialRepository storeCommercialRepository;

    @Spy
    private DatasetSpatialVersion datasetSpatialVersion = new DatasetSpatialVersion(SNAPSHOT);

    @Spy
    private StoreDistrictMapper storeDistrictMapper = Mappers.getMapper(StoreDistrictMapper.class);

    @Spy
    private StoreAdministrationMapper storeAdministrationMapper = Mappers.getMapper(StoreAdministrationMapper.class);

    @Spy
    private StoreCommercialMapper storeCommercialMapper = Mappers.getMapper(StoreCommercialMapper.class);

    @InjectMocks
    private CommercialSummaryRepositoryAdapter adapter;

    @Test
    @DisplayName("세 단위 점포 조회가 각자 자기 테이블을 공간 스냅샷으로 거르고 점포 수 세 컬럼을 옮긴다")
    void eachStoreLookupHitsItsOwnTableWithTheConfiguredSnapshot() {
        when(storeDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCodeAndSpatialVersion(PERIOD, "11350", COFFEE, SNAPSHOT))
            .thenReturn(Optional.of(StoreDistrictEntity.builder()
                .id(1L).periodCode(PERIOD).spatialVersion(SNAPSHOT).districtCode("11350").districtName("노원구")
                .serviceCode(COFFEE).serviceName("커피-음료")
                .totalStoreCount(700L).similarStoreCount(809L).franchiseStoreCount(109L)
                .openedStoreCount(0L).closedStoreCount(0L).openingRate(0.0).closureRate(0.0)
                .build()));
        when(storeAdministrationRepository.findByPeriodCodeAndAdministrationCodeAndServiceCodeAndSpatialVersion(
            PERIOD, "11350600", COFFEE, SNAPSHOT))
            .thenReturn(Optional.of(StoreAdministrationEntity.builder()
                .id(2L).periodCode(PERIOD).spatialVersion(SNAPSHOT).administrationCode("11350600").administrationName("공릉2동")
                .serviceCode(COFFEE).serviceName("커피-음료")
                .totalStoreCount(90L).similarStoreCount(102L).franchiseStoreCount(12L)
                .openedStoreCount(0L).closedStoreCount(0L).openingRate(0.0).closureRate(0.0)
                .build()));
        when(storeCommercialRepository.findByPeriodCodeAndCommercialCodeAndServiceCodeAndSpatialVersion(PERIOD, "3110438", COFFEE, SNAPSHOT))
            .thenReturn(Optional.of(StoreCommercialEntity.builder()
                .id(3L).periodCode(PERIOD).spatialVersion(SNAPSHOT).commercialCode("3110438").commercialName("경춘선숲길 우측")
                .serviceCode(COFFEE).serviceName("커피-음료")
                .totalStoreCount(10L).similarStoreCount(20L).franchiseStoreCount(10L)
                .openedStoreCount(0L).closedStoreCount(0L).openingRate(0.0).closureRate(0.0)
                .build()));

        assertThat(adapter.findStoreDistrict(PERIOD, "11350", COFFEE)).hasValueSatisfying(store -> {
            assertThat(store.districtCode()).isEqualTo("11350");
            assertThat(store.similarStoreCount()).isEqualTo(809L);
            assertThat(store.totalStoreCount()).isEqualTo(700L);
            assertThat(store.franchiseStoreCount()).isEqualTo(109L);
        });
        assertThat(adapter.findStoreAdministration(PERIOD, "11350600", COFFEE)).hasValueSatisfying(store -> {
            assertThat(store.administrationCode()).isEqualTo("11350600");
            assertThat(store.similarStoreCount()).isEqualTo(102L);
            assertThat(store.totalStoreCount()).isEqualTo(90L);
            assertThat(store.franchiseStoreCount()).isEqualTo(12L);
        });
        assertThat(adapter.findStoreCommercial(PERIOD, "3110438", COFFEE)).hasValueSatisfying(store -> {
            assertThat(store.commercialCode()).isEqualTo("3110438");
            assertThat(store.similarStoreCount()).isEqualTo(20L);
            assertThat(store.totalStoreCount()).isEqualTo(10L);
            assertThat(store.franchiseStoreCount()).isEqualTo(10L);
        });
    }

    @Test
    @DisplayName("점포 행이 없으면 예외 없이 비운다")
    void missingStoreRowIsEmpty() {
        assertThat(adapter.findStoreDistrict(PERIOD, "11350", COFFEE)).isEmpty();
        assertThat(adapter.findStoreAdministration(PERIOD, "11350600", COFFEE)).isEmpty();
        assertThat(adapter.findStoreCommercial(PERIOD, "3110438", COFFEE)).isEmpty();
    }
}
