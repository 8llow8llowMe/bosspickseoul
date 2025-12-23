package com.followfollowme.nowdoboss.domainlayer.district.domain.model;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record StoreDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtCodeName,
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
