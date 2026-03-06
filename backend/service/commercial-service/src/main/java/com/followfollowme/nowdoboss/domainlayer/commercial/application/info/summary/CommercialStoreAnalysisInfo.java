package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialStoreAnalysisInfo(
    long totalStoreCount,
    long similarStoreCount,
    double openingRate,
    long openedStoreCount,
    double closureRate,
    long closedStoreCount,
    long franchiseStoreCount,
    List<CommercialPeerStoreInfo> peerStores
) {

    public static CommercialStoreAnalysisInfo of(StoreCommercial target, List<CommercialPeerStoreInfo> peers) {
        return CommercialStoreAnalysisInfo.builder()
            .totalStoreCount(target.totalStoreCount())
            .similarStoreCount(target.similarStoreCount())
            .openingRate(target.openingRate())
            .openedStoreCount(target.openedStoreCount())
            .closureRate(target.closureRate())
            .closedStoreCount(target.closedStoreCount())
            .franchiseStoreCount(target.franchiseStoreCount())
            .peerStores(peers)
            .build();
    }
}
