package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/stores} 응답 본문의 wire 표현.
 *
 * <p>peer 의 {@code CommercialStoreAnalysisResponse} 와 {@code CommercialPeerStoreItem} 은 alias 없이
 * 컴포넌트 이름 그대로 내려온다. 그 이름을 아는 책임은 이 어댑터 계층 타입에만 있고,
 * {@code application/port/out/query} 의 QueryResult 는 알지 않는다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialStoreAnalysisClientResponse(
    long totalStoreCount,
    long similarStoreCount,
    double openingRate,
    long openedStoreCount,
    double closureRate,
    long closedStoreCount,
    long franchiseStoreCount,
    List<CommercialPeerStoreClientResponse> peerStores
) {

}
