package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 내 개업률 상위 행정동 정보")
public record DistrictOpenedStoreAdministrationTopItem(
    @Schema(description = "행정동 코드", example = "11680580")
    String administrationCode,

    @Schema(description = "행정동명", example = "삼성1동")
    String administrationName,

    @Schema(description = "개업 점포 수", example = "132")
    long openedStoreCount,

    @Schema(description = "개업률(%)", example = "8.5")
    double openingRate
) {

}
