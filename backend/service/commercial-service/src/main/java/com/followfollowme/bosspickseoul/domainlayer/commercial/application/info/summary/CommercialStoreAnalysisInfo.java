package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialStoreAnalysisInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
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
            .periodCode(target.periodCode())
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
