package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "비교 지표 항목 DTO")
public record ComparisonMetricItem(

    @Schema(description = "지표명", example = "총 매출액")
    String label,

    @Schema(description = "좌측 상권 값")
    double leftValue,

    @Schema(description = "우측 상권 값")
    double rightValue,

    @Schema(description = "좌측 - 우측 차이값")
    double diffValue,

    @Schema(description = "차이율(%)")
    double diffRate,

    @Schema(description = "우세 방향 메타데이터")
    CodeNameDescriptionMetadata winnerSide
) {

}
