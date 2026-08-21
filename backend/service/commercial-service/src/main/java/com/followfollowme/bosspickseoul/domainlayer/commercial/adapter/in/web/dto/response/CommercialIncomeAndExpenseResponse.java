package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialAverageIncomeItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialExpenseByCategoryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 소득 및 소비 지출 정보 조회 응답")
public record CommercialIncomeAndExpenseResponse(

    @Schema(description = "월 평균 소득")
    CommercialAverageIncomeItem averageIncomeItem,

    @Schema(description = "카테고리별 지출")
    CommercialExpenseByCategoryItem expenseByCategoryItem
) {

}
