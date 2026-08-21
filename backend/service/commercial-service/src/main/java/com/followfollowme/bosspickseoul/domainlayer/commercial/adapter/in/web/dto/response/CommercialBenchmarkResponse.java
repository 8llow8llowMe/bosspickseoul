package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 벤치마크 응답 DTO")
public record CommercialBenchmarkResponse(

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명")
    String commercialName,

    @Schema(description = "자치구 코드", example = "11680")
    String districtCode,

    @Schema(description = "자치구명")
    String districtName,

    @Schema(description = "행정동 코드", example = "11680521")
    String administrationCode,

    @Schema(description = "행정동명")
    String administrationName,

    @Schema(description = "벤치마크 전체 요약")
    String summary,

    @Schema(description = "매출 벤치마크 응답 DTO")
    CommercialSalesSummaryResponse salesSummary,

    @Schema(description = "소비력 벤치마크 응답 DTO")
    CommercialIncomeSummaryResponse incomeSummary,

    @Schema(description = "벤치마크 하이라이트")
    List<String> benchmarkHighlights
) {
}
