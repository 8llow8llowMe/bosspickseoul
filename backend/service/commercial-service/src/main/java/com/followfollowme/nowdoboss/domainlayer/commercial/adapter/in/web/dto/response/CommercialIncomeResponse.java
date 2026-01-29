package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialAverageIncomeItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialCategorySpendingItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 지출 내역 분석 조회 응답 DTO")
public record CommercialIncomeResponse(
    
    @Schema(description = "상권 내 월 평균 소득 정보")
    CommercialAverageIncomeItem averageIncomeItem,

    @Schema(description = "상권 내 소비 카테고리별 지출 금액 정보")
    CommercialCategorySpendingItem categorySpendingItem
) {

}
