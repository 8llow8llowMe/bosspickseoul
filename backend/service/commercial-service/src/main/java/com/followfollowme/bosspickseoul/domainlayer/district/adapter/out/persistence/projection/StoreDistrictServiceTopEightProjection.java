package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection;

public record StoreDistrictServiceTopEightProjection(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

}
