package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.StoreDistrictRepository;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictClosedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictOpenedStoreTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.mapper.StoreDistrictMapper;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.StoreDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.StoreDistrict;
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
    public List<DistrictOpenedStoreTopTenInfo> findTopTenByOpenedStore(String currentPeriodCode, String previousPeriodCode) {
        return storeDistrictRepository.findTopTenByOpenedStore(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(projection -> DistrictOpenedStoreTopTenInfo.builder()
                .districtCode(projection.districtCode())
                .districtName(projection.districtName())
                .openedStoreCount(projection.openedStoreCount())
                .openingChangeRate(projection.openingChangeRate())
                .build())
            .toList();
    }

    @Override
    public List<DistrictClosedStoreTopTenInfo> findTopTenByClosedStore(String currentPeriodCode, String previousPeriodCode) {
        return storeDistrictRepository.findTopTenByClosedStore(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(projection -> DistrictClosedStoreTopTenInfo.builder()
                .districtCode(projection.districtCode())
                .districtName(projection.districtName())
                .closedStoreCount(projection.closedStoreCount())
                .closureChangeRate(projection.closureChangeRate())
                .build())
            .toList();
    }
}
