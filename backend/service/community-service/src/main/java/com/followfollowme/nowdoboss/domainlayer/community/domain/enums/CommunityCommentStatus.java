package com.followfollowme.nowdoboss.domainlayer.community.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunityCommentStatus {

    ACTIVE("정상"),
    DELETED("삭제");

    private final String description;
}
