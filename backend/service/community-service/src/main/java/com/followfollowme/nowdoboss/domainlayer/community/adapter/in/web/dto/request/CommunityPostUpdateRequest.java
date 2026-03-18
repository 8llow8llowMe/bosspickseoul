package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityPostUpdateRequest(
    @NotBlank
    @Size(max = 120)
    String title,

    @NotBlank
    @Size(max = 5000)
    String content
) {

}
