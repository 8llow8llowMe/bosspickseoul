package com.followfollowme.nowdoboss.domainlayer.community.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunityAnalysisType implements CodeNameDescribable {
    COMMERCIAL_COMPARISON("상권 비교 분석");

    private final String displayName;
}
