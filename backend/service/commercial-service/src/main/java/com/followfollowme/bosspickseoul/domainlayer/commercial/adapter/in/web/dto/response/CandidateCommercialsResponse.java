package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CandidateCommercialItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 응답 DTO")
public record CandidateCommercialsResponse(

    @Schema(description = "서비스 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "기준 분기 코드", example = "20233")
    String periodCode,

    @Schema(description = "후보 탐색 프리셋 메타데이터 (CandidatePresetType)",
        example = "{\"code\": \"BALANCED\", \"name\": \"균형형\", \"description\": \"기회·위험·혼잡·거주수요 네 축을 균형 있게 반영한 기본 추천 프리셋입니다.\"}")
    CodeNameDescriptionMetadata preset,

    @Schema(description = "우선 반영 지표 메타데이터")
    ScoreMetricMetadata priorityMetric,

    @Schema(description = "요청한 상위 개수", example = "10")
    int topN,

    @Schema(description = "응답 요약")
    String summary,

    @Schema(description = "후보 상권 목록 (복합 점수 내림차순)")
    List<CandidateCommercialItem> items
) {

}
