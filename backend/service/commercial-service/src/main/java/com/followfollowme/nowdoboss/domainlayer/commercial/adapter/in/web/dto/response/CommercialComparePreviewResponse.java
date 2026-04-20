package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialComparisonTargetItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ComparisonMetricItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 경량 비교 응답 DTO")
public record CommercialComparePreviewResponse(

    @Schema(description = "좌측 상권 요약")
    CommercialComparisonTargetItem left,

    @Schema(description = "우측 상권 요약")
    CommercialComparisonTargetItem right,

    @Schema(description = "추천 측 메타데이터")
    CodeNameDescriptionMetadata recommendedSide,

    @Schema(description = "핵심 지표 목록 (매출·유동인구·점포수·개업률·폐업률·월평균소득)")
    List<ComparisonMetricItem> headlineMetrics
) {

}
