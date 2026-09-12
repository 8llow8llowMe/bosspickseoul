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

    @Schema(description = "상대 차이율(%). 우측 값이 0이면 기존 호환 규칙에 따라 0")
    double diffRate,

    @Schema(description = "좌측/우측 값의 표시 단위", example = "원")
    String unit,

    @Schema(description = "화면 표시 권장 소수 자릿수", example = "0")
    int displayPrecision,

    @Schema(description = "차이값의 표시 단위. 비중 지표는 %p", example = "%p")
    String differenceUnit,

    @Schema(description = "지표의 집계 및 해석 기준")
    String description,

    @Schema(description = "우세 방향 메타데이터")
    CodeNameDescriptionMetadata winnerSide
) {

}
