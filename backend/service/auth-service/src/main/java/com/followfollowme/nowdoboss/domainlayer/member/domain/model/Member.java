package com.followfollowme.nowdoboss.domainlayer.member.domain.model;

import com.followfollowme.nowdoboss.domainlayer.member.domain.model.enums.MemberStatus;
import lombok.Builder;

@Builder
public record Member(
    long id,
    String email,
    String password,
    String name,
    String nickname,
    String profileImageUrl,
    MemberStatus status
) {

}
