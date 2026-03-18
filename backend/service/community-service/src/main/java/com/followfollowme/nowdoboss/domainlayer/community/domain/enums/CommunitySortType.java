package com.followfollowme.nowdoboss.domainlayer.community.domain.enums;

import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunitySortType {

    LATEST("날짜순"),
    POPULAR("인기순");

    private final String description;

    public static CommunitySortType from(String value) {
        try {
            return CommunitySortType.valueOf(value.toUpperCase());
        } catch (RuntimeException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_SORT_TYPE);
        }
    }
}
