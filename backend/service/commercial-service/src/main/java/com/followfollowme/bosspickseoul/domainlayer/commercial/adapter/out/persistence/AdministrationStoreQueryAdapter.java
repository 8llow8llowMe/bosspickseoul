package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.AdministrationStoreQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query.AdministrationServiceStoreQueryResult;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdministrationStoreQueryAdapter implements AdministrationStoreQueryPort {

    private final StoreAdministrationRepository storeAdministrationRepository;
    private final DatasetSpatialVersion datasetSpatialVersion;

    @Override
    public List<AdministrationServiceStoreQueryResult> findAllByPeriodCodeAndAdministrationCode(
        String periodCode, String administrationCode
    ) {
        return storeAdministrationRepository.findAllByPeriodCodeAndAdministrationCodeAndSpatialVersion(
                periodCode, administrationCode, datasetSpatialVersion.value())
            .stream()
            .map(entity -> AdministrationServiceStoreQueryResult.builder()
                .serviceCode(entity.getServiceCode())
                .serviceName(entity.getServiceName())
                .totalStoreCount(entity.getTotalStoreCount())
                .build())
            .toList();
    }
}
