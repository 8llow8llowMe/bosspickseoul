package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.repository.StoreCommercialRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.mapper.StoreCommercialMapper;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.StoreCommercialRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StoreCommercialRepositoryAdapter implements StoreCommercialRepositoryPort {

    private final StoreCommercialRepository storeCommercialRepository;
    private final StoreCommercialMapper storeCommercialMapper;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public Optional<StoreCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(
        String periodCode, String commercialCode, String serviceCode
    ) {
        return storeCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndServiceCodeAndSpatialVersion(
                periodCode, commercialCode, serviceCode, datasetSpatialVersion.value())
            .map(storeCommercialMapper::toDomainFromEntity);
    }

    @Override
    public List<StoreCommercial> findByPeriodCodeAndCommercialCodeAndServiceType(
        String periodCode, String commercialCode, ServiceType serviceType
    ) {
        return storeCommercialRepository
            .findByPeriodCodeAndCommercialCodeAndServiceTypeAndSpatialVersion(
                periodCode, commercialCode, serviceType, datasetSpatialVersion.value())
            .stream()
            .map(storeCommercialMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public List<StoreCommercial> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
        String commercialCode,
        String serviceCode,
        List<String> periodCodes
    ) {
        return storeCommercialRepository
            .findByCommercialCodeAndServiceCodeAndSpatialVersionAndPeriodCodeIn(
                commercialCode, serviceCode, datasetSpatialVersion.value(), periodCodes)
            .stream()
            .map(storeCommercialMapper::toDomainFromEntity)
            .toList();
    }

    @Override
    public List<StoreCommercial> findAllByPeriodCodeAndCommercialCode(String periodCode, String commercialCode) {
        return storeCommercialRepository
            .findAllByPeriodCodeAndCommercialCodeAndSpatialVersion(periodCode, commercialCode, datasetSpatialVersion.value())
            .stream()
            .map(storeCommercialMapper::toDomainFromEntity)
            .toList();
    }
}
