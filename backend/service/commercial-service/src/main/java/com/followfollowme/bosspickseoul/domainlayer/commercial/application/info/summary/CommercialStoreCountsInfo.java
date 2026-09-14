package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.StoreCommercial;
import lombok.Builder;

/**
 * 점포 집계 수치만 담는다. {@link CommercialStoreAnalysisInfo} 에서 {@code peerStores} 를 뺀 모양이다.
 *
 * <p>왜 따로 두는가. 동종업종 피어 목록을 채우려면 상권마다 조회가 한 번 더 나간다
 * ({@code CommercialQueryProcessor#findPeerStores}). 히트맵과 후보 추천은 아래 수치만 쓰고 피어는
 * 읽지 않으므로, 그 경로가 {@link CommercialStoreAnalysisInfo} 를 재사용하면 쓰지도 않을 조회를
 * 상권 수만큼 던지게 된다.
 *
 * <p>{@code peerStores} 가 빈 목록인 {@link CommercialStoreAnalysisInfo} 를 돌려주는 선택지도 있었지만,
 * 「피어가 없다」와 「피어를 조회하지 않았다」가 호출부에서 구분되지 않는다. 타입을 나누면 피어가 필요한
 * 쪽이 컴파일 단계에서 갈린다.
 */
@Builder
public record CommercialStoreCountsInfo(
    long totalStoreCount,
    long similarStoreCount,
    double openingRate,
    long openedStoreCount,
    double closureRate,
    long closedStoreCount,
    long franchiseStoreCount
) {

    public static CommercialStoreCountsInfo from(StoreCommercial store) {
        return CommercialStoreCountsInfo.builder()
            .totalStoreCount(store.totalStoreCount())
            .similarStoreCount(store.similarStoreCount())
            .openingRate(store.openingRate())
            .openedStoreCount(store.openedStoreCount())
            .closureRate(store.closureRate())
            .closedStoreCount(store.closedStoreCount())
            .franchiseStoreCount(store.franchiseStoreCount())
            .build();
    }
}
