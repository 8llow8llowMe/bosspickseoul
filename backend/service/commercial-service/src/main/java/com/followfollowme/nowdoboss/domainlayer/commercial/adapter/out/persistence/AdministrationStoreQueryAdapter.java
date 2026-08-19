package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.out.persistence.repository.StoreAdministrationRepository;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.AdministrationStoreQueryPort;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.AdministrationServiceStoreQueryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdministrationStoreQueryAdapter implements AdministrationStoreQueryPort {

    private final StoreAdministrationRepository storeAdministrationRepository;

    @Override
    public List<AdministrationServiceStoreQueryResult> findAllByPeriodCodeAndAdministrationCode(
        String periodCode, String administrationCode
    ) {
        return storeAdministrationRepository.findAllByPeriodCodeAndAdministrationCode(periodCode, administrationCode)
            .stream()
            .map(entity -> AdministrationServiceStoreQueryResult.builder()
                .serviceCode(entity.getServiceCode())
                .serviceName(entity.getServiceName())
                .totalStoreCount(entity.getTotalStoreCount())
                .build())
            .toList();
    }
}
