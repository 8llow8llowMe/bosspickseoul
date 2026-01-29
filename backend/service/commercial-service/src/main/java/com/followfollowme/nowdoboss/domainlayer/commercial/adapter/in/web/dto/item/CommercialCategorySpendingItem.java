package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 소비 카테고리별 지출 금액 정보 DTO")
public record CommercialCategorySpendingItem(

    @Schema(description = "식료품 소비 지출 금액", example = "320000")
    long groceryPrice,

    @Schema(description = "의류·신발 소비 지출 금액", example = "180000")
    long clothesPrice,

    @Schema(description = "의료비 소비 지출 금액", example = "95000")
    long medicalPrice,

    @Schema(description = "생활용품 소비 지출 금액", example = "210000")
    long lifePrice,

    @Schema(description = "교통 관련 소비 지출 금액", example = "130000")
    long trafficPrice,

    @Schema(description = "여가·오락 소비 지출 금액", example = "170000")
    long leisurePrice,

    @Schema(description = "문화·취미 소비 지출 금액", example = "90000")
    long culturePrice,

    @Schema(description = "교육 관련 소비 지출 금액", example = "160000")
    long educationPrice,

    @Schema(description = "유흥·사치 소비 지출 금액", example = "70000")
    long luxuryPrice
) {

}
