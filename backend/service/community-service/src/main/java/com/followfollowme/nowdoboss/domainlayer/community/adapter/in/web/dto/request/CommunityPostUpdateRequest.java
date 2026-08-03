package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityPostUpdateRequest(
    @NotBlank(message = "COMMUNITY_103:제목은 필수입니다.")
    @Size(max = 120, message = "COMMUNITY_104:제목은 120자 이하만 가능합니다.")
    String title,

    @NotBlank(message = "COMMUNITY_105:본문은 필수입니다.")
    @Size(max = 5000, message = "COMMUNITY_106:본문은 5000자 이하만 가능합니다.")
    String content
) {

}
