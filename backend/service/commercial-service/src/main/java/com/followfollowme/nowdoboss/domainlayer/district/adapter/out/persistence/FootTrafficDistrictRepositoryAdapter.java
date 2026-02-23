package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.repository.FootTrafficDistrictRepository;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.DistrictAreaProjection;
import com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import com.followfollowme.nowdoboss.domainlayer.district.application.mapper.FootTrafficDistrictMapper;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.FootTrafficDistrictTopTenQueryResult;
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
    public List<FootTrafficDistrict> findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(List<String> periodCodes, String districtCode) {
        return footTrafficDistrictRepository.findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(periodCodes, districtCode)
            .stream()
            .map(footTrafficDistrictMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public List<DistrictAreaQueryResult> findDistrictAreasByPeriodCode(String periodCode) {
        return footTrafficDistrictRepository.findDistrictAreasByPeriodCode(periodCode)
            .stream()
            .map(this::toDistrictAreaQueryResult)
            .toList();
    }

    @Override
    public List<FootTrafficDistrictTopTenQueryResult> findTopTenByFootTraffic(String currentPeriodCode, String previousPeriodCode) {
        return footTrafficDistrictRepository.findTopTenByFootTraffic(currentPeriodCode, previousPeriodCode)
            .stream()
            .map(this::toFootTrafficTopTenQueryResult)
            .toList();
    }

    private DistrictAreaQueryResult toDistrictAreaQueryResult(DistrictAreaProjection projection) {
        return DistrictAreaQueryResult.builder()
            .districtCode(projection.districtCode())
            .districtName(projection.districtName())
            .build();
    }

    private FootTrafficDistrictTopTenQueryResult toFootTrafficTopTenQueryResult(FootTrafficDistrictTopTenProjection projection) {
        return FootTrafficDistrictTopTenQueryResult.builder()
            .districtCode(projection.districtCode())
            .districtName(projection.districtName())
            .totalFootTraffic(projection.totalFootTraffic())
            .footTrafficChangeRate(projection.footTrafficChangeRate())
            .build();
    }
}
