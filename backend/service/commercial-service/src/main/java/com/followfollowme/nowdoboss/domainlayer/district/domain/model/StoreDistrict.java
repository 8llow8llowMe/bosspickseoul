package com.followfollowme.nowdoboss.domainlayer.district.domain.model;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record StoreDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtName,
    String serviceCode,
    String serviceName,
    ServiceType serviceType,
    long totalStoreCount,
    long similarStoreCount,
    long openedStoreCount,
    long closedStoreCount,
    long franchiseStoreCount,
    double openingRate,
    double closureRate
) {

}
