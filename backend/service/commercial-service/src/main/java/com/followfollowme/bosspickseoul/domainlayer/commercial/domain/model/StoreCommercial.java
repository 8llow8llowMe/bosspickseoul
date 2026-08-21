package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record StoreCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    String serviceCode,
    String serviceName,
    ServiceType serviceType,
    long totalStoreCount,
    long similarStoreCount,
    double openingRate,
    long openedStoreCount,
    double closureRate,
    long closedStoreCount,
    long franchiseStoreCount
) {

}
