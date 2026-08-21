package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "게시글 좋아요 응답")
public record CommunityPostLikeResponse(
    @Schema(description = "게시글 ID")
    long postId,

    @Schema(description = "좋아요 적용 여부")
    boolean liked,

    @Schema(description = "현재 좋아요 수")
    long likeCount
) {

}
