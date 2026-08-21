package com.followfollowme.bosspickseoul.domainlayer.community.application.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
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
