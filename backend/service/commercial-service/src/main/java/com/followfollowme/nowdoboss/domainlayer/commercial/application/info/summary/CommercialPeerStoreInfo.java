package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.StoreCommercial;
import lombok.Builder;

@Builder
public record CommercialPeerStoreInfo(
    String serviceCode,
    String serviceName,
    long totalStoreCount,
    double openingRate,
    double closureRate
) {

    public static CommercialPeerStoreInfo from(StoreCommercial storeCommercial) {
        return CommercialPeerStoreInfo.builder()
            .serviceCode(storeCommercial.serviceCode())
            .serviceName(storeCommercial.serviceName())
            .totalStoreCount(storeCommercial.totalStoreCount())
            .openingRate(storeCommercial.openingRate())
            .closureRate(storeCommercial.closureRate())
            .build();
    }
}
