package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityCommentCreateRequest(
    @NotBlank
    @Size(max = 1000)
    String content
) {

}
