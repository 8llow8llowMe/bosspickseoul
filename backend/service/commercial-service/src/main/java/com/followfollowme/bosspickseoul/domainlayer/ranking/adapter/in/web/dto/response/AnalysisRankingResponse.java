package com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.in.web.dto.item.AnalysisRankingItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "분석 인기 순위 응답")
public record AnalysisRankingResponse(

    @Schema(description = "분석 영역 타입 메타데이터")
    CodeNameDescriptionMetadata areaType,

    @Schema(description = "집계 시간 윈도우 (시간 단위)", example = "24")
    int windowHours,

    @Schema(description = "인기 순위 목록 (조회 수 내림차순)")
    List<AnalysisRankingItem> rankings
) {

}
