package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import java.time.LocalDateTime;

public record CommunityPost(
    long id,
    long memberId,
    CommunityTargetType targetType,
    String targetCode,
    String targetName,
    String title,
    String content,
    // 분석 첨부 (비교 초안에서 넘어온 글에만 값이 있고, 일반 글은 전부 null)
    CommunityAnalysisType analysisType,
    String analysisRefCode,
    String analysisRefName,
    String analysisSnapshotKey,
    CommunityPostStatus status,
    long likeCount,
    long commentCount,
    long viewCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

}
