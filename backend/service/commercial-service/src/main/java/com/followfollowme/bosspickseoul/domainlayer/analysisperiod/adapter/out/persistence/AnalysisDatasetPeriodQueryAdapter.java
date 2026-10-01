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
import org.springframework.transaction.annotation.Transactional;

/**
 * 데이터셋 15종을 각자의 팩트 테이블로 잇고 적재 분기를 모은다. 배치 이관({@code ChangeCommercialProjectionJdbcAdapter})이
 * 같은 데이터셋을 같은 테이블에 쓴다 — 소비 3종은 {@code income_*} 테이블이다.
 */
@Component
public class AnalysisDatasetPeriodQueryAdapter implements AnalysisDatasetPeriodQueryPort {

    /** 15개 질의 전체의 상한(초). 인덱스가 있으면 수십 ms 다. 넘기면 이번 갱신만 실패하고 다음 주기에 다시 시도한다. */
    static final int QUERY_TIMEOUT_SECONDS = 10;

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
     * 15개 질의를 한 읽기 전용 트랜잭션(커넥션 하나)으로 묶고 전체에 {@value #QUERY_TIMEOUT_SECONDS}초 상한을 둔다. 호출자는 스케줄러뿐이라
     * 바깥 트랜잭션이 없다. 상한을 넘기거나 커넥션을 얻지 못하면 예외가 그대로 나가고(포트 실패 계약) 캐시는 마지막 성공값을 유지한다.
     * 큰 테이블 4종(점포·매출의 상권·행정동)은 {@code (period_code, spatial_version)} 인덱스로 loose index scan 을 탄다
     * (런북 {@code scripts/migration/analysis-period-index.sql}, 배포 전 적용).
     *
     * <p>데이터셋마다 테이블이 달라 한 질의로 묶을 수 없어 15번 질의한다. 원천 단위가 테이블이라 N+1 이 아니다.
     */
    @Override
    @Transactional(readOnly = true, timeout = QUERY_TIMEOUT_SECONDS)
    public Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion) {
        Map<DatasetKey, SortedSet<String>> periodCodes = new EnumMap<>(DatasetKey.class);
        periodQueries.forEach((dataset, query) -> periodCodes.put(dataset, new TreeSet<>(query.apply(spatialVersion))));
        return periodCodes;
    }
}
