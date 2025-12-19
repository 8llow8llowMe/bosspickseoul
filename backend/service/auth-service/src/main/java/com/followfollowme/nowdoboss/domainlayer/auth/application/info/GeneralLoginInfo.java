package com.followfollowme.nowdoboss.domainlayer.auth.application.info;

import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
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
