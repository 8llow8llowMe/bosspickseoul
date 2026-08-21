package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictClosedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictOpenedTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.StoreDistrictServiceTopEightProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.StoreDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictServiceTopEightQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.StoreDistrict;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StoreDistrictRepositoryAdapter implements StoreDistrictRepositoryPort {

    private final StoreDistrictRepository storeDistrictRepository;
    private final StoreDistrictMapper storeDistrictMapper;

    @Override
    public Optional<StoreDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(
        String periodCode, String districtCode, String serviceCode) {
        return storeDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCode(
                periodCode, districtCode, serviceCode)
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

    private StoreDistrictServiceTopEightQueryResult toServiceTopEightQueryResult(StoreDistrictServiceTopEightProjection projection) {
        return StoreDistrictServiceTopEightQueryResult.builder()
            .serviceCode(projection.serviceCode())
            .serviceName(projection.serviceName())
            .totalStoreCount(projection.totalStoreCount())
            .build();
    }
}
