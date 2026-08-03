package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityValidationMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommunityCommentCreateRequest(
    Long parentCommentId,

    @NotBlank(message = CommunityValidationMessage.COMMENT_CONTENT_REQUIRED)
    @Size(max = 1000, message = CommunityValidationMessage.COMMENT_CONTENT_LENGTH_INVALID)
    String content
) {

}
