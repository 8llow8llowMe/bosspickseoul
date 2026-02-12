package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.SalesDistrictRepository;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictSalesTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.mapper.SalesDistrictMapper;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.SalesDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.SalesDistrict;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SalesDistrictRepositoryAdapter implements SalesDistrictRepositoryPort {

    private final SalesDistrictRepository salesDistrictRepository;
    private final SalesDistrictMapper salesDistrictMapper;

    @Override
    public Optional<SalesDistrict> findByPeriodCodeAndDistrictCodeAndServiceCode(String periodCode, String districtCode, String serviceCode) {
        return salesDistrictRepository.findByPeriodCodeAndDistrictCodeAndServiceCode(
                periodCode, districtCode, serviceCode)
            .map(salesDistrictMapper::toDomainFromEntity);
    }

    @Override
    public List<DistrictSalesTopTenInfo> findTopTenBySales(String currentPeriodCode, String previousPeriodCode) {
        return salesDistrictRepository.findTopTenBySales(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(projection -> DistrictSalesTopTenInfo.builder()
                .districtCode(projection.districtCode())
                .districtName(projection.districtName())
                .totalSalesAmount(projection.totalSalesAmount())
                .salesChangeRate(projection.salesChangeRate())
                .build())
            .toList();
    }
}
