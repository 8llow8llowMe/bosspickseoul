package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityValidationMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityPostUpdateRequest(
    @NotBlank(message = CommunityValidationMessage.TITLE_REQUIRED)
    @Size(max = 120, message = CommunityValidationMessage.TITLE_LENGTH_INVALID)
    String title,

    @NotBlank(message = CommunityValidationMessage.CONTENT_REQUIRED)
    @Size(max = 5000, message = CommunityValidationMessage.CONTENT_LENGTH_INVALID)
    String content
) {

}
