package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection;

public record StoreDistrictServiceTopEightProjection(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

}
