package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityCommentCreateRequest(
    Long parentCommentId,

    @NotBlank(message = "COMMUNITY_107:댓글 내용은 필수입니다.")
    @Size(max = 1000, message = "COMMUNITY_108:댓글은 1000자 이하만 가능합니다.")
    String content
) {

}
