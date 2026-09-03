package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import java.util.Locale;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunityAnalysisType implements CodeNameDescribable {
    COMMERCIAL_COMPARISON("상권 비교 분석");

    private final String displayName;

    public static CommunityAnalysisType from(String value) {
        try {
            return CommunityAnalysisType.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_ANALYSIS_TYPE);
        }
    }
}
