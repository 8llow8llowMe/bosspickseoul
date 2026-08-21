package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunitySortType implements CodeNameDescribable {

    LATEST("날짜순"),
    POPULAR("인기순");

    private final String displayName;

    public static CommunitySortType from(String value) {
        try {
            return CommunitySortType.valueOf(value.toUpperCase());
        } catch (RuntimeException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_SORT_TYPE);
        }
    }
}
