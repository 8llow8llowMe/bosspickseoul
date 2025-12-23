package com.followfollowme.nowdoboss.domainlayer.administration.domain.model;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record StoreAdministration(
    long id,
    String periodCode,
    String administrationCode,
    String administrationCodeName,
    String serviceCode,
    String serviceCodeName,
    ServiceType serviceType,
    long totalStore,
    long similarStore,
    long openedStore,
    long closedStore,
    long franchiseStore,
    double openedRate,
    double closedRate
) {

}
