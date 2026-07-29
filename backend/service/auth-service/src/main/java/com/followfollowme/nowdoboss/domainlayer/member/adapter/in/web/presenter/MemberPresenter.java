package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.info.MemberMyInfo;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import org.springframework.stereotype.Component;

@Component
public class MemberPresenter {

    public MemberMyInfoResponse toMyInfoResponse(MemberMyInfo info) {
        SecurityRole role = info.role();
        return MemberMyInfoResponse.builder()
            .memberId(String.valueOf(info.memberId()))
            .email(info.email())
            .name(info.name())
            .nickname(info.nickname())
            .profileImageUrl(info.profileImageUrl())
            .role(CodeNameDescriptionMetadata.of(role.name(), role.getDisplayName(), role.getDisplayName()))
            .provider(info.provider() == null ? null : info.provider().name())
            .build();
    }
}
