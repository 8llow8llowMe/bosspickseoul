package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "분기별 트렌드 항목")
public record CommercialTrendItemDto(

    @Schema(description = "기준 년분기 코드", example = "20233")
    String periodCode,

    @Schema(description = "지표 값 (매출: 원, 유동인구: 명, 점포: 개)", example = "123456789")
    Double value,

    @Schema(description = "직전 분기 대비 증감률 (null: 첫 분기)", example = "0.05")
    Double changeRate
) {

}
