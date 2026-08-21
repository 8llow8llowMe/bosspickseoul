package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record CommercialPeerStoreItem(

    @Schema(description = "서비스 코드")
    String serviceCode,

    @Schema(description = "서비스명")
    String serviceName,

    @Schema(description = "총 점포 수")
    long totalStoreCount,

    @Schema(description = "개업률")
    double openingRate,

    @Schema(description = "폐업률")
    double closureRate
) {

}
