package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.ChangeDistrictRepository;
import com.followfollowme.bosspickseoul.domainlayer.district.application.mapper.ChangeDistrictMapper;
import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.ChangeDistrictRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.model.ChangeDistrict;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChangeDistrictRepositoryAdapter implements ChangeDistrictRepositoryPort {

    private final ChangeDistrictRepository changeDistrictRepository;
    private final ChangeDistrictMapper changeDistrictMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<ChangeDistrict> findByPeriodCodeAndDistrictCode(String periodCode, String districtCode) {
        return changeDistrictRepository
            .findByPeriodCodeAndDistrictCodeAndSpatialVersion(periodCode, districtCode, datasetSpatialVersion.value())
            .map(changeDistrictMapper::toDomainFromEntity);
    }
}
