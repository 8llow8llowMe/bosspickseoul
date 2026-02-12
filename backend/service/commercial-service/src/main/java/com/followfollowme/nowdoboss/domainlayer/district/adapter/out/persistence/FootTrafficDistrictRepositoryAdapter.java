package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.FootTrafficDistrictRepository;
import com.followfollowme.nowdoboss.domainlayer.district.application.info.DistrictFootTrafficTopTenInfo;
import com.followfollowme.nowdoboss.domainlayer.district.application.mapper.FootTrafficDistrictMapper;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.domain.model.FootTrafficDistrict;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FootTrafficDistrictRepositoryAdapter implements FootTrafficDistrictRepositoryPort {

    private final FootTrafficDistrictRepository footTrafficDistrictRepository;
    private final FootTrafficDistrictMapper footTrafficDistrictMapper;

    @Override
    public Optional<FootTrafficDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode) {
        return footTrafficDistrictRepository.findByPeriodCodeAndDistrictCode(periodCode, districtCode)
            .map(footTrafficDistrictMapper::toDomainFromEntity);
    }

    @Override
    public List<DistrictFootTrafficTopTenInfo> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode) {
        return footTrafficDistrictRepository.findTopTenByFootTraffic(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(projection -> DistrictFootTrafficTopTenInfo.builder()
                .districtCode(projection.districtCode())
                .districtName(projection.districtName())
                .totalFootTraffic(projection.totalFootTraffic())
                .footTrafficChangeRate(projection.footTrafficChangeRate())
                .build())
            .toList();
    }
}
