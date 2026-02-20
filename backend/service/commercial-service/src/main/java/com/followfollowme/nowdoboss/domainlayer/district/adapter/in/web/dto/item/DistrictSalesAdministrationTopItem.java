package com.followfollowme.nowdoboss.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구 내 행정동별 매출 상위 항목")
public record DistrictSalesAdministrationTopItem(
    @Schema(description = "행정동 코드", example = "11680580")
    String administrationCode,

    @Schema(description = "행정동명", example = "역삼1동")
    String administrationName,

    @Schema(description = "총 매출 금액", example = "15847230000")
    long totalSalesAmount,

    @Schema(description = "전분기 대비 매출 증감률 (%)", example = "-5.6")
    double salesChangeRate
) {

}
