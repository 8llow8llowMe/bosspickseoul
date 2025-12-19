package com.followfollowme.nowdoboss.domainlayer.auth.application.info;

import lombok.Builder;

@Builder
public record JwtTokenReissueInfo(
    String accessToken
) {

    public static JwtTokenReissueInfo of(String accessToken) {
        return JwtTokenReissueInfo.builder()
            .accessToken(accessToken)
            .build();
    }
}
