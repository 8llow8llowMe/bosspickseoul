package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.preview;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparePreviewInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    CommercialComparisonTargetInfo left,
    CommercialComparisonTargetInfo right,
    CodeNameDescriptionMetadata recommendedSide,
    List<ComparisonMetricInfo> headlineMetrics,
    String insightOneLiner
) {

}
