package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "소비 항목 하나와 그 지출 금액. 항목 수와 구성은 provenance.scope 에 따라 달라지므로 배열 순서대로 그린다")
public record CommercialExpenseCategoryItem(

    @Schema(
        description = "항목 키. 상권 스코프는 GROCERY·CLOTHING_FOOTWEAR·MEDICAL·HOUSEHOLD·TRANSPORTATION·LEISURE·CULTURE·EDUCATION·ENTERTAINMENT 9개, "
            + "행정동 대체 스코프는 LEISURE·CULTURE 대신 LEISURE_CULTURE 를 쓰고 OTHER·DINING 이 더해진 10개다",
        example = "GROCERY")
    String key,

    @Schema(description = "항목 화면 문구. 스코프마다 구성이 달라 서버가 내려보낸다", example = "식료품")
    String label,

    @Schema(description = "지출 금액(원)", example = "320000")
    long amount
) {

}
