package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.SalesCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.SalesCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.SalesCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SalesCommercialRepositoryAdapter implements SalesCommercialRepositoryPort {

    private final SalesCommercialRepository salesCommercialRepository;
    private final SalesCommercialMapper salesCommercialMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<String> findDistinctServiceCodesByCommercialCode(String commercialCode) {
        return salesCommercialRepository.findDistinctServiceCodesByCommercialCode(
            commercialCode, datasetSpatialVersion.value());
    }

    @Override
    public Optional<SalesCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode
    ) {
        return salesCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndServiceCodeAndSpatialVersion(
                periodCode, commercialCode, serviceCode, datasetSpatialVersion.value())
            .map(salesCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<SalesCommercial> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
        String commercialCode,
        String serviceCode,
        List<String> periodCodes
    ) {
        return salesCommercialRepository
            .findByCommercialCodeAndServiceCodeAndSpatialVersionAndPeriodCodeIn(
                commercialCode, serviceCode, datasetSpatialVersion.value(), periodCodes)
            .stream()
            .map(salesCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
