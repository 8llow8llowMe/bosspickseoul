package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberMyInfo;
import org.springframework.stereotype.Component;

@Component
public class MemberPresenter {

    public MemberMyInfoResponse toMyInfoResponse(MemberMyInfo info) {
        return MemberMyInfoResponse.builder()
            .memberId(String.valueOf(info.memberId()))
            .email(info.email())
            .name(info.name())
            .nickname(info.nickname())
            .profileImageUrl(info.profileImageUrl())
            .roleCode(info.role().name())
            .roleDescription(info.role().getDescription())
            .build();
    }
}
