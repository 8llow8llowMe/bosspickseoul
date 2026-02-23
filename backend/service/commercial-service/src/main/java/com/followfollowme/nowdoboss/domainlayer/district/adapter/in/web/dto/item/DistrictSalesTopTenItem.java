package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 매출 Top 10 정보")
public record DistrictSalesTopTenItem(

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명", example = "강남구")
    String districtName,

    @Schema(description = "총 매출 금액", example = "15847230000")
    long totalSalesAmount,

    @Schema(description = "전분기 대비 매출 증감률 (%)", example = "5.3")
    double salesChangeRate
) {

}
