package com.followfollowme.nowdoboss.domainlayer.community.domain.enums;

import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommunityReportTargetKind {

    POST("게시글"),
    COMMENT("댓글");

    private final String description;

    public static CommunityReportTargetKind from(String value) {
        try {
            return CommunityReportTargetKind.valueOf(value.toUpperCase());
        } catch (RuntimeException exception) {
            throw new CommunityException(CommunityErrorCode.INVALID_REPORT_TARGET_KIND);
        }
    }
}
