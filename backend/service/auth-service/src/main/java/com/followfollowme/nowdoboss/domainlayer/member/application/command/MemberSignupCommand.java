package com.followfollowme.nowdoboss.domainlayer.member.application.command;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.MemberSignupRequest;
import lombok.Builder;

@Builder
public record MemberSignupCommand(
    String email,
    String password,
    String name,
    String nickname
) {

    public static MemberSignupCommand from(MemberSignupRequest request) {
        return MemberSignupCommand.builder()
            .email(request.email())
            .password(request.password())
            .name(request.name())
            .nickname(request.nickname())
            .build();
    }
}
