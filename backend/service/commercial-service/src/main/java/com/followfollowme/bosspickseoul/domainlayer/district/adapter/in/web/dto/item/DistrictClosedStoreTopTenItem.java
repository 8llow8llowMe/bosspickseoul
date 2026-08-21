package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 폐업 점포 Top 10 정보")
public record DistrictClosedStoreTopTenItem(

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "폐업 점포 수", example = "872")
    long closedStoreCount,

    @Schema(description = "전분기 대비 폐업률 증감률 (%)", example = "-2.3")
    double closureChangeRate
) {

}
