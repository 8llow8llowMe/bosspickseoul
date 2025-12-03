package com.followfollowme.nowdoboss.security.common.dto;

import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record MemberLoginActive(
    Long id,
    SecurityRole role
) {

}
