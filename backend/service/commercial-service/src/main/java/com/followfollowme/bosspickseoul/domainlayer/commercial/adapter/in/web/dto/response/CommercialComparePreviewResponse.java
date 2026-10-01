package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialComparisonTargetItem;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.ComparisonMetricItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 경량 비교 응답 DTO")
public record CommercialComparePreviewResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 periodCode 를 생략하면 서버가 정한 기본 분기(GET /api/v1/commercials/periods 의 defaultPeriodCode)", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String periodCode,

    @Schema(description = "좌측 상권 요약")
    CommercialComparisonTargetItem left,

    @Schema(description = "우측 상권 요약")
    CommercialComparisonTargetItem right,

    @Schema(description = "추천 측 메타데이터")
    CodeNameDescriptionMetadata recommendedSide,

    @Schema(description = "핵심 지표 목록 (매출·유동인구·점포수·개업률·폐업률·월평균소득)")
    List<ComparisonMetricItem> headlineMetrics,

    @Schema(description = "AI 한 줄 인사이트", example = "강남역이 매출 기준 32% 우위입니다.")
    String insightOneLiner
) {

}
