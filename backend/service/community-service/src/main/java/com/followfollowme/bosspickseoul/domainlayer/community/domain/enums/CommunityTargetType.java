package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunityTargetType implements CodeNameDescribable {

    DISTRICT("자치구"),
    ADMINISTRATION("행정동"),
    COMMERCIAL("상권");

    private final String displayName;

    public static CommunityTargetType from(String value) {
        try {
            return CommunityTargetType.valueOf(value.toUpperCase());
        } catch (RuntimeException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_TARGET_TYPE);
        }
    }
}
