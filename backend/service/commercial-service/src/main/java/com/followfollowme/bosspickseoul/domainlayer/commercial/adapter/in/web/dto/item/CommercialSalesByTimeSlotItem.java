package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 시간대별 매출액 정보")
public record CommercialSalesByTimeSlotItem(

    @Schema(description = "00~06시 매출액", example = "150000")
    long salesAmountTime00To06,

    @Schema(description = "06~11시 매출액", example = "200000")
    long salesAmountTime06To11,

    @Schema(description = "11~14시 매출액", example = "380000")
    long salesAmountTime11To14,

    @Schema(description = "14~17시 매출액", example = "300000")
    long salesAmountTime14To17,

    @Schema(description = "17~21시 매출액", example = "450000")
    long salesAmountTime17To21,

    @Schema(description = "21~24시 매출액", example = "300000")
    long salesAmountTime21To24
) {

}
