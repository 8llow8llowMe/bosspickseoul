package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record StoreCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    String serviceCode,
    String serviceCodeName,
    ServiceType serviceType,
    long totalStore,
    long similarStore,
    double openedRate,
    long openedStore,
    double closedRate,
    long closedStore,
    long franchiseStore
) {

}
