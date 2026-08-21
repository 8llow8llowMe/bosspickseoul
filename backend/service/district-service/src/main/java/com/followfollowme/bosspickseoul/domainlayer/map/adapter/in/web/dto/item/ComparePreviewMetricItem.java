package com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 프리뷰 지표 항목 DTO")
public record ComparePreviewMetricItem(

    @Schema(description = "지표 이름", example = "총 매출액")
    String label,

    @Schema(description = "좌측 상권 값")
    double leftValue,

    @Schema(description = "우측 상권 값")
    double rightValue,

    @Schema(description = "차이값 (left - right)")
    double diffValue,

    @Schema(description = "차이율 (%)")
    double diffRate,

    @Schema(description = "승리 측 메타데이터")
    CodeNameDescriptionMetadata winnerSide
) {

}
