package com.followfollowme.bosspickseoul.domainlayer.auth.application.info;

import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record GeneralLoginInfo(
    long memberId,
    SecurityRole role
) {

    public static GeneralLoginInfo of(long memberId, SecurityRole role) {
        return GeneralLoginInfo.builder()
            .memberId(memberId)
            .role(role)
            .build();
    }
}
