package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.IncomeAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.SalesAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.ChangeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.FacilityCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.FootTrafficCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.IncomeCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.PopulationCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.SalesCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.StoreCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.ChangeDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.FootTrafficDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.IncomeDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 데이터셋 15종이 각자 맞는 팩트 테이블 리포지터리에 이어졌는지 못 박는다.
 *
 * <p>짝을 손으로 적는 자리라 둘을 바꿔 적어도 컴파일된다. 그러면 한 데이터셋의 분기가 다른 테이블 값으로 보이고,
 * 기본 분기가 실제로 비어 있는 분기를 가리켜 그 화면이 404 가 된다. 리포지터리마다 고유 표식을 돌려주게 해 대조한다.
 * 소비 3종은 {@code income_*} 테이블이다(배치 {@code ChangeCommercialProjectionJdbcAdapter} 와 같다).
 */
class AnalysisDatasetPeriodQueryAdapterTest {

    private static final String SPATIAL_VERSION = "test-snapshot";

    private final SalesCommercialRepository salesCommercial = mock(SalesCommercialRepository.class);
    private final StoreCommercialRepository storeCommercial = mock(StoreCommercialRepository.class);
    private final FootTrafficCommercialRepository footTrafficCommercial = mock(FootTrafficCommercialRepository.class);
    private final ChangeCommercialRepository changeCommercial = mock(ChangeCommercialRepository.class);
    private final PopulationCommercialRepository populationCommercial = mock(PopulationCommercialRepository.class);
    private final FacilityCommercialRepository facilityCommercial = mock(FacilityCommercialRepository.class);
    private final IncomeCommercialRepository incomeCommercial = mock(IncomeCommercialRepository.class);
    private final SalesAdministrationRepository salesAdministration = mock(SalesAdministrationRepository.class);
    private final StoreAdministrationRepository storeAdministration = mock(StoreAdministrationRepository.class);
    private final IncomeAdministrationRepository incomeAdministration = mock(IncomeAdministrationRepository.class);
    private final SalesDistrictRepository salesDistrict = mock(SalesDistrictRepository.class);
    private final StoreDistrictRepository storeDistrict = mock(StoreDistrictRepository.class);
    private final FootTrafficDistrictRepository footTrafficDistrict = mock(FootTrafficDistrictRepository.class);
    private final IncomeDistrictRepository incomeDistrict = mock(IncomeDistrictRepository.class);
    private final ChangeDistrictRepository changeDistrict = mock(ChangeDistrictRepository.class);

    @Test
    @DisplayName("데이터셋 15종이 모두 자기 팩트 테이블 리포지터리에 이어진다")
    void everyDatasetKeyIsWiredToItsOwnFactTable() {
        when(salesCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("sales_commercial"));
        when(storeCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("store_commercial"));
        when(footTrafficCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("foot_traffic_commercial"));
        when(changeCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("change_commercial"));
        when(populationCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("population_commercial"));
        when(facilityCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("facility_commercial"));
        when(incomeCommercial.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("income_commercial"));
        when(salesAdministration.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("sales_administration"));
        when(storeAdministration.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("store_administration"));
        when(incomeAdministration.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("income_administration"));
        when(salesDistrict.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("sales_district"));
        when(storeDistrict.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("store_district"));
        when(footTrafficDistrict.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("foot_traffic_district"));
        when(incomeDistrict.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("income_district"));
        when(changeDistrict.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("change_district"));

        Map<DatasetKey, SortedSet<String>> periods = adapter().findPeriodCodesByDataset(SPATIAL_VERSION);

        assertThat(periods).containsOnlyKeys(DatasetKey.values());
        assertThat(periods.get(DatasetKey.SALES_COMMERCIAL)).containsExactly("sales_commercial");
        assertThat(periods.get(DatasetKey.STORE_COMMERCIAL)).containsExactly("store_commercial");
        assertThat(periods.get(DatasetKey.FOOT_TRAFFIC_COMMERCIAL)).containsExactly("foot_traffic_commercial");
        assertThat(periods.get(DatasetKey.CHANGE_COMMERCIAL)).containsExactly("change_commercial");
        assertThat(periods.get(DatasetKey.POPULATION_COMMERCIAL)).containsExactly("population_commercial");
        assertThat(periods.get(DatasetKey.FACILITY_COMMERCIAL)).containsExactly("facility_commercial");
        assertThat(periods.get(DatasetKey.CONSUMPTION_COMMERCIAL)).containsExactly("income_commercial");
        assertThat(periods.get(DatasetKey.SALES_ADMINISTRATION)).containsExactly("sales_administration");
        assertThat(periods.get(DatasetKey.STORE_ADMINISTRATION)).containsExactly("store_administration");
        assertThat(periods.get(DatasetKey.CONSUMPTION_ADMINISTRATION)).containsExactly("income_administration");
        assertThat(periods.get(DatasetKey.SALES_DISTRICT)).containsExactly("sales_district");
        assertThat(periods.get(DatasetKey.STORE_DISTRICT)).containsExactly("store_district");
        assertThat(periods.get(DatasetKey.FOOT_TRAFFIC_DISTRICT)).containsExactly("foot_traffic_district");
        assertThat(periods.get(DatasetKey.CONSUMPTION_DISTRICT)).containsExactly("income_district");
        assertThat(periods.get(DatasetKey.CHANGE_DISTRICT)).containsExactly("change_district");
    }

    @Test
    @DisplayName("중복 분기를 하나로 접고 오름차순으로 돌려준다")
    void periodCodesAreDistinctAndSorted() {
        when(changeDistrict.findDistinctPeriodCodesBySpatialVersion(SPATIAL_VERSION)).thenReturn(List.of("20261", "20233", "20261"));

        Map<DatasetKey, SortedSet<String>> periods = adapter().findPeriodCodesByDataset(SPATIAL_VERSION);

        assertThat(periods.get(DatasetKey.CHANGE_DISTRICT)).containsExactly("20233", "20261");
        assertThat(periods.get(DatasetKey.SALES_COMMERCIAL)).as("Mockito 기본 응답은 빈 목록이다").isEmpty();
    }

    private AnalysisDatasetPeriodQueryAdapter adapter() {
        return new AnalysisDatasetPeriodQueryAdapter(
            salesCommercial, storeCommercial, footTrafficCommercial, changeCommercial, populationCommercial, facilityCommercial,
            incomeCommercial, salesAdministration, storeAdministration, incomeAdministration,
            salesDistrict, storeDistrict, footTrafficDistrict, incomeDistrict, changeDistrict);
    }
}
