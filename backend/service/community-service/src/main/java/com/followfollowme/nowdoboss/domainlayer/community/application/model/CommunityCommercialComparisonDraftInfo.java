package com.followfollowme.nowdoboss.domainlayer.community.application.model;

import lombok.Builder;

@Builder
public record CommunityCommercialComparisonDraftInfo(
    String targetType,
    String targetCode,
    String targetName,
    String title,
    String content,
    String analysisType,
    String analysisRefCode,
    String analysisRefName,
    String analysisSnapshotKey
) {
}
