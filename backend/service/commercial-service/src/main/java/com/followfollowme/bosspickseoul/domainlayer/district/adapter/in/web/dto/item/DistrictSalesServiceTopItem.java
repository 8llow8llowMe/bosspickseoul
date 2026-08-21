package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 업종별 매출 상위 항목")
public record DistrictSalesServiceTopItem(
    @Schema(description = "업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "업종명", example = "한식음식점")
    String serviceName,

    @Schema(description = "전분기 대비 매출 증감률 (%)", example = "7.2")
    double salesChangeRate
) {

}
