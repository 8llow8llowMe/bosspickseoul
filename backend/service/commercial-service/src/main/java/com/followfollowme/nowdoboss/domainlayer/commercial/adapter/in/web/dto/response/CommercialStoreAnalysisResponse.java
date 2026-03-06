package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialPeerStoreItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 및 업종 점포 분석 응답")
public record CommercialStoreAnalysisResponse(

    @Schema(description = "총 점포 수")
    long totalStoreCount,

    @Schema(description = "동일 업종군 내 점포 수")
    long similarStoreCount,

    @Schema(description = "개업률")
    double openingRate,

    @Schema(description = "개업 점포 수")
    long openedStoreCount,

    @Schema(description = "폐업률")
    double closureRate,

    @Schema(description = "폐업 점포 수")
    long closedStoreCount,

    @Schema(description = "프랜차이즈 점포 수")
    long franchiseStoreCount,

    @Schema(description = "동일 업종 내 비교 대상 상권 목록")
    List<CommercialPeerStoreItem> peerStores
) {

}
