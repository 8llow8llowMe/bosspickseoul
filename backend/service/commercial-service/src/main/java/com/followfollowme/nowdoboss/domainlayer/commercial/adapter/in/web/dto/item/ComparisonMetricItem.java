package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.ComparisonWinnerSide;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record ComparisonMetricItem(
    @Schema(description = "지표명", example = "월 매출액")
    String label,
    @Schema(description = "좌측 상권 값")
    double leftValue,
    @Schema(description = "우측 상권 값")
    double rightValue,
    @Schema(description = "좌측 - 우측 차이값")
    double diffValue,
    @Schema(description = "차이율(%)")
    double diffRate,
    @Schema(description = "우세 방향", example = "LEFT")
    ComparisonWinnerSide winnerSide
) {

}
