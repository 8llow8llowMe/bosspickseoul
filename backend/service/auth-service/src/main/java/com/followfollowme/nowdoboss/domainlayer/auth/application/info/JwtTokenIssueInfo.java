package com.followfollowme.nowdoboss.domainlayer.auth.application.info;

import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record JwtTokenIssueInfo(
    long memberId,
    SecurityRole role,
    String accessToken
) {

    public static JwtTokenIssueInfo of(long memberId, SecurityRole role, String accessToken) {
        return JwtTokenIssueInfo.builder()
            .memberId(memberId)
            .role(role)
            .accessToken(accessToken)
            .build();
    }
}
