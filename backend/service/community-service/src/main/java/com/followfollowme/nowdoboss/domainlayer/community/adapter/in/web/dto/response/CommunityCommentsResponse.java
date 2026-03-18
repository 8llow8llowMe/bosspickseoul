package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "댓글 목록 응답")
public record CommunityCommentsResponse(
    @Schema(description = "댓글 목록")
    List<CommunityCommentItem> comments
) {

}
