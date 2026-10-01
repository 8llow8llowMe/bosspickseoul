package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.IncomeAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.SalesAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out.AnalysisDatasetPeriodQueryPort;
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
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.function.Function;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 데이터셋 15종을 각자의 팩트 테이블로 잇고 적재 분기를 모은다. 배치 이관({@code ChangeCommercialProjectionJdbcAdapter})이
 * 같은 데이터셋을 같은 테이블에 쓴다 — 소비 3종은 {@code income_*} 테이블이다.
 */
@Component
public class AnalysisDatasetPeriodQueryAdapter implements AnalysisDatasetPeriodQueryPort {

    private final Map<DatasetKey, Function<String, List<String>>> periodQueries;

    public AnalysisDatasetPeriodQueryAdapter(
        SalesCommercialRepository salesCommercialRepository, StoreCommercialRepository storeCommercialRepository,
        FootTrafficCommercialRepository footTrafficCommercialRepository, ChangeCommercialRepository changeCommercialRepository,
        PopulationCommercialRepository populationCommercialRepository, FacilityCommercialRepository facilityCommercialRepository,
        IncomeCommercialRepository incomeCommercialRepository,
        SalesAdministrationRepository salesAdministrationRepository, StoreAdministrationRepository storeAdministrationRepository,
        IncomeAdministrationRepository incomeAdministrationRepository,
        SalesDistrictRepository salesDistrictRepository, StoreDistrictRepository storeDistrictRepository,
        FootTrafficDistrictRepository footTrafficDistrictRepository, IncomeDistrictRepository incomeDistrictRepository,
        ChangeDistrictRepository changeDistrictRepository
    ) {
        Map<DatasetKey, Function<String, List<String>>> queries = new EnumMap<>(DatasetKey.class);
        queries.put(DatasetKey.SALES_COMMERCIAL, salesCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.STORE_COMMERCIAL, storeCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, footTrafficCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.CHANGE_COMMERCIAL, changeCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.POPULATION_COMMERCIAL, populationCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.FACILITY_COMMERCIAL, facilityCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.CONSUMPTION_COMMERCIAL, incomeCommercialRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.SALES_ADMINISTRATION, salesAdministrationRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.STORE_ADMINISTRATION, storeAdministrationRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.CONSUMPTION_ADMINISTRATION, incomeAdministrationRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.SALES_DISTRICT, salesDistrictRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.STORE_DISTRICT, storeDistrictRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.FOOT_TRAFFIC_DISTRICT, footTrafficDistrictRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.CONSUMPTION_DISTRICT, incomeDistrictRepository::findDistinctPeriodCodesBySpatialVersion);
        queries.put(DatasetKey.CHANGE_DISTRICT, changeDistrictRepository::findDistinctPeriodCodesBySpatialVersion);
        for (DatasetKey dataset : DatasetKey.values()) {
            if (!queries.containsKey(dataset)) {
                throw new IllegalStateException("No period query registered for dataset " + dataset);
            }
        }
        this.periodQueries = Collections.unmodifiableMap(queries);
    }

    /**
     * 호출한 유스케이스의 트랜잭션과 분리한다(REQUIRES_NEW). 갱신 질의가 실패하면 Hibernate 가 그 트랜잭션을
     * rollback-only 로 표시하는데, 바깥 조회 트랜잭션에 섞여 있으면 마지막 성공값(stale)으로 응답해도 커밋에서
     * {@code UnexpectedRollbackException} 이 난다. 갱신은 TTL 마다 한 요청만 하므로 커넥션을 하나 더 쓰는 비용은 작다.
     *
     * <p>데이터셋마다 테이블이 달라 한 질의로 묶을 수 없어 15번 질의한다. 원천 단위가 테이블이라 N+1 이 아니다.
     */
    @Override
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion) {
        Map<DatasetKey, SortedSet<String>> periodCodes = new EnumMap<>(DatasetKey.class);
        periodQueries.forEach((dataset, query) -> periodCodes.put(dataset, new TreeSet<>(query.apply(spatialVersion))));
        return periodCodes;
    }
}
