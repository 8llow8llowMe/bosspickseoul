package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparePreviewInfo(
    // 상류(commercial-service)가 실제로 조회한 분기. 요청이 분기를 생략하면 상류가 정한 기본 분기다(이슈 #464).
    String periodCode,
    ComparePreviewTargetInfo left,
    ComparePreviewTargetInfo right,
    CodeNameDescriptionMetadata recommendedSide,
    List<ComparePreviewMetricInfo> headlineMetrics,
    String insightOneLiner
) {

}
