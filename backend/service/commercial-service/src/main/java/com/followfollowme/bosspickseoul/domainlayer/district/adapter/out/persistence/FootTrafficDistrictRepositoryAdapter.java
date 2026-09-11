package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.FootTrafficDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.DistrictAreaProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection.FootTrafficDistrictTopTenProjection;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.FootTrafficDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.FootTrafficDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.FootTrafficDistrictTopTenQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.FootTrafficDistrict;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FootTrafficDistrictRepositoryAdapter implements FootTrafficDistrictRepositoryPort {

    private final FootTrafficDistrictRepository footTrafficDistrictRepository;
    private final FootTrafficDistrictMapper footTrafficDistrictMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<FootTrafficDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode) {
        return footTrafficDistrictRepository
            .findByPeriodCodeAndDistrictCodeAndSpatialVersion(periodCode, districtCode, datasetSpatialVersion.value())
            .map(footTrafficDistrictMapper::toDomainFromEntity);
    }

    @Override
    public List<FootTrafficDistrict> findByPeriodCodeInAndDistrictCodeOrderByPeriodCode(List<String> periodCodes, String districtCode) {
        return footTrafficDistrictRepository
            .findByPeriodCodeInAndDistrictCodeAndSpatialVersionOrderByPeriodCode(
                periodCodes, districtCode, datasetSpatialVersion.value())
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
