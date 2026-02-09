package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 소비 카테고리별 지출 금액 정보")
public record CommercialExpenseByCategoryItem(

    @Schema(description = "식료품 지출 금액", example = "320000")
    long groceryExpenseAmount,

    @Schema(description = "의류·신발 지출 금액", example = "180000")
    long clothingExpenseAmount,

    @Schema(description = "의료비 지출 금액", example = "95000")
    long medicalExpenseAmount,

    @Schema(description = "생활용품 지출 금액", example = "210000")
    long householdExpenseAmount,

    @Schema(description = "교통 지출 금액", example = "130000")
    long transportationExpenseAmount,

    @Schema(description = "여가·오락 지출 금액", example = "170000")
    long leisureExpenseAmount,

    @Schema(description = "문화·취미 지출 금액", example = "90000")
    long cultureExpenseAmount,

    @Schema(description = "교육 지출 금액", example = "160000")
    long educationExpenseAmount,

    @Schema(description = "유흥 지출 금액", example = "70000")
    long entertainmentExpenseAmount
) {

}
