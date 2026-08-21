package com.followfollowme.bosspickseoul.domainlayer.auth.application.info;

import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record JwtTokenIssueInfo(
    long memberId,
    SecurityRole role,
    String accessToken,
    String refreshToken
) {

    public static JwtTokenIssueInfo of(long memberId, SecurityRole role, String accessToken, String refreshToken) {
        return JwtTokenIssueInfo.builder()
            .memberId(memberId)
            .role(role)
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .build();
    }
}
