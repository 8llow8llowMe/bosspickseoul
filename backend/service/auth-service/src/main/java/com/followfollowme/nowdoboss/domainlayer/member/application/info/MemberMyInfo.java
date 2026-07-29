package com.followfollowme.nowdoboss.domainlayer.member.application.info;

import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record MemberMyInfo(
    long memberId,
    String email,
    String name,
    String nickname,
    String profileImageUrl,
    SecurityRole role,
    OAuthProvider provider
) {

    public static MemberMyInfo from(Member member) {
        return MemberMyInfo.builder()
            .memberId(member.id())
            .email(member.email())
            .name(member.name())
            .nickname(member.nickname())
            .profileImageUrl(member.profileImageUrl())
            .role(member.role())
            .provider(member.provider())
            .build();
    }
}
