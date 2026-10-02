package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedRankingProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictServiceTopEightProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.StoreDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedRankingQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictServiceTopEightQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StoreDistrictRepositoryAdapter implements StoreDistrictRepositoryPort {

    private final StoreDistrictRepository storeDistrictRepository;
    private final StoreDistrictMapper storeDistrictMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<StoreDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(
        String periodCode, String districtCode, String serviceCode) {
        return storeDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCodeAndSpatialVersion(
                periodCode, districtCode, serviceCode, datasetSpatialVersion.value())
            .map(storeDistrictMapper::toDomainFromEntity);
    }

    @Override
    public List<StoreDistrictOpenedTopTenQueryResult> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        return storeDistrictRepository.findTopTenByOpenedStore(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(this::toOpenedTopTenQueryResult)
            .toList();
    }

    @Override
    public List<StoreDistrictClosedTopTenQueryResult> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        return storeDistrictRepository.findTopTenByClosedStore(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(this::toClosedTopTenQueryResult)
            .toList();
    }

    @Override
    public List<StoreDistrictOpenedRankingQueryResult> findRankingsByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        return storeDistrictRepository.findRankingsByOpenedStore(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(this::toOpenedRankingQueryResult)
            .toList();
    }

    @Override
    public List<StoreDistrictClosedRankingQueryResult> findRankingsByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        return storeDistrictRepository.findRankingsByClosedStore(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(this::toClosedRankingQueryResult)
            .toList();
    }

    @Override
    public List<StoreDistrictServiceTopEightQueryResult> findTopEightByTotalStore(String periodCode, String districtCode) {
        return storeDistrictRepository.findTopEightByTotalStore(periodCode, districtCode)
            .stream()
            .map(this::toServiceTopEightQueryResult)
            .toList();
    }

    private StoreDistrictOpenedTopTenQueryResult toOpenedTopTenQueryResult(StoreDistrictOpenedTopTenProjection projection) {
        return StoreDistrictOpenedTopTenQueryResult.builder()
            .districtCode(projection.districtCode())
            .districtName(projection.districtName())
            .openedStoreCount(projection.openedStoreCount())
            .openingChangeRate(projection.openingChangeRate())
            .build();
    }

    private StoreDistrictClosedTopTenQueryResult toClosedTopTenQueryResult(StoreDistrictClosedTopTenProjection projection) {
        return StoreDistrictClosedTopTenQueryResult.builder()
            .districtCode(projection.districtCode())
            .districtName(projection.districtName())
            .closedStoreCount(projection.closedStoreCount())
            .closureChangeRate(projection.closureChangeRate())
            .build();
    }

    private StoreDistrictOpenedRankingQueryResult toOpenedRankingQueryResult(StoreDistrictOpenedRankingProjection projection) {
        return StoreDistrictOpenedRankingQueryResult.builder()
            .districtCode(projection.districtCode())
            .districtName(projection.districtName())
            .openedStoreCount(projection.openedStoreCount())
            .openingChangeRate(projection.openingChangeRate())
            .build();
    }

    private StoreDistrictClosedRankingQueryResult toClosedRankingQueryResult(StoreDistrictClosedRankingProjection projection) {
        return StoreDistrictClosedRankingQueryResult.builder()
            .districtCode(projection.districtCode())
            .districtName(projection.districtName())
            .closedStoreCount(projection.closedStoreCount())
            .closureChangeRate(projection.closureChangeRate())
            .build();
    }

    private StoreDistrictServiceTopEightQueryResult toServiceTopEightQueryResult(StoreDistrictServiceTopEightProjection projection) {
        return StoreDistrictServiceTopEightQueryResult.builder()
            .serviceCode(projection.serviceCode())
            .serviceName(projection.serviceName())
            .totalStoreCount(projection.totalStoreCount())
            .build();
    }
}
