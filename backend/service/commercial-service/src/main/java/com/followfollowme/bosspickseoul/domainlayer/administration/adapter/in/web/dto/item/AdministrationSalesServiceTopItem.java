package com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "행정동 매출 상위 업종 항목")
public record AdministrationSalesServiceTopItem(
    @Schema(description = "서비스 코드")
    String serviceCode,
    @Schema(description = "서비스명")
    String serviceName,
    @Schema(description = "월 매출 금액")
    long monthlySalesAmount,
    @Schema(description = "직전 분기 대비 매출 증감률")
    double salesChangeRate
) {

}
