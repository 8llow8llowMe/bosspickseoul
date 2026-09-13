package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialStoreAnalysisQueryResult(
    long totalStoreCount,
    long similarStoreCount,
    double openingRate,
    long openedStoreCount,
    double closureRate,
    long closedStoreCount,
    long franchiseStoreCount,
    List<CommercialPeerStoreQueryResult> peerStores
) {

}

