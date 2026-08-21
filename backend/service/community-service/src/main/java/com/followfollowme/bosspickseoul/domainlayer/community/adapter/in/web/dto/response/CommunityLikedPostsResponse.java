package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.persistence.dto.SliceResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "좋아요한 게시글 목록 응답")
public record CommunityLikedPostsResponse(
    @Schema(description = "좋아요한 게시글 목록")
    SliceResponse<CommunityLikedPostItem> posts
) {

}
