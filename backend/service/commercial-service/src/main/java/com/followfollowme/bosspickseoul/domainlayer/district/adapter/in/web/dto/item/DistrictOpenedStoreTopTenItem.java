package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 개업 점포 Top 10 정보")
public record DistrictOpenedStoreTopTenItem(

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "개업 점포 수", example = "1523")
    long openedStoreCount,

    @Schema(description = "전분기 대비 개업률 증감률 (%)", example = "8.5")
    double openingChangeRate
) {

}
