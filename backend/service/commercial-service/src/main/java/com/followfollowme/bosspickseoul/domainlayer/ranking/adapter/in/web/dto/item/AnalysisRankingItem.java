package com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "분석 인기 순위 항목")
public record AnalysisRankingItem(

    @Schema(description = "순위 (1부터)", example = "1")
    int rank,

    @Schema(description = "영역 코드", example = "3110008")
    String areaCode,

    @Schema(description = "영역 이름 (수집되지 않았으면 null)", example = "강남역")
    String areaName,

    @Schema(description = "윈도우 내 조회 수", example = "128")
    long viewCount
) {

}
