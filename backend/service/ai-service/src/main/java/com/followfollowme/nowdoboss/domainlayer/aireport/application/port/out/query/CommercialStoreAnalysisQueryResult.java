package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import java.util.List;

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

record CommercialPeerStoreQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount,
    double openingRate,
    double closureRate
) {}
