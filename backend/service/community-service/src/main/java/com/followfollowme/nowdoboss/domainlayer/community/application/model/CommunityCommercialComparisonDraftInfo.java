package com.followfollowme.nowdoboss.domainlayer.community.application.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import lombok.Builder;

@Builder
public record CommunityCommercialComparisonDraftInfo(
    CommunityTargetType targetType,
    String targetCode,
    String targetName,
    String title,
    String content,
    CommunityAnalysisType analysisType,
    String analysisRefCode,
    String analysisRefName,
    String analysisSnapshotKey
) {
}
