package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.FootTrafficCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.FootTrafficCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.FootTrafficCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FootTrafficCommercialRepositoryAdapter implements FootTrafficCommercialRepositoryPort {

    private final FootTrafficCommercialRepository footTrafficCommercialRepository;
    private final FootTrafficCommercialMapper footTrafficCommercialMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<FootTrafficCommercial> findByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return footTrafficCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndSpatialVersion(periodCode, commercialCode, datasetSpatialVersion.value())
            .map(footTrafficCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<FootTrafficCommercial> findByCommercialCodeAndPeriodCodeIn(String commercialCode, List<String> periodCodes) {
        return footTrafficCommercialRepository
            .findByCommercialCodeAndSpatialVersionAndPeriodCodeIn(commercialCode, datasetSpatialVersion.value(), periodCodes)
            .stream()
            .map(footTrafficCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
