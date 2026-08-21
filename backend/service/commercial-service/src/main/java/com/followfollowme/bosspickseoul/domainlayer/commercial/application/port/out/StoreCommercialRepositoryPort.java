package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import java.util.Optional;

public interface StoreCommercialRepositoryPort {

    Optional<StoreCommercial> findByPeriodCodeAndCommercialCodeAndServiceCode(String periodCode, String commercialCode, String serviceCode);

    List<StoreCommercial> findByPeriodCodeAndCommercialCodeAndServiceType(
        String periodCode, String commercialCode, ServiceType serviceType);

    List<StoreCommercial> findByCommercialCodeAndServiceCodeAndPeriodCodeIn(
        String commercialCode,
        String serviceCode,
        List<String> periodCodes
    );

    List<StoreCommercial> findAllByPeriodCodeAndCommercialCode(String periodCode, String commercialCode);
}
