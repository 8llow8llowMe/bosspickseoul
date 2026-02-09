package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 성별 매출건수 정보")
public record CommercialSalesCountByGenderItem(

    @Schema(description = "남성 매출건수", example = "10")
    long maleSalesCount,

    @Schema(description = "여성 매출건수", example = "10")
    long femaleSalesCount
) {

}
