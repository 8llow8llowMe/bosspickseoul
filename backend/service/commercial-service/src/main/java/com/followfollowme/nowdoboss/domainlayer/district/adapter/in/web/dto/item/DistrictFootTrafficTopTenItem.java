package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 유동인구 Top 10 정보")
public record DistrictFootTrafficTopTenItem(

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "총 유동인구 수", example = "5847230")
    long totalFootTraffic,

    @Schema(description = "전분기 대비 유동인구 증감률 (%)", example = "12.5")
    double footTrafficChangeRate
) {

}