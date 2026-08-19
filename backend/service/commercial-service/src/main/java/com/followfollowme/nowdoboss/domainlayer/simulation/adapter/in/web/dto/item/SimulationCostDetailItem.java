package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "창업 비용 상세 항목 DTO (단위: 만원)")
public record SimulationCostDetailItem(

    @Schema(description = "월 임대료 (만원)", example = "290")
    long rentPrice,

    @Schema(description = "보증금 — 월 임대료 10개월분 (만원)", example = "2900")
    long deposit,

    @Schema(description = "인테리어 비용 (만원)", example = "4500")
    long interior,

    @Schema(description = "가맹 부담금 합계 (만원, 비프랜차이즈면 null)", nullable = true)
    Long levy
) {

}
