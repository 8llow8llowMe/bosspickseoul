package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "댓글 항목")
public record CommunityCommentItem(
    @Schema(description = "댓글 ID")
    long commentId,

    @Schema(description = "게시글 ID")
    long postId,

    @Schema(description = "작성자 회원 ID")
    long memberId,

    @Schema(description = "본문")
    String content,

    @Schema(description = "좋아요 수")
    long likeCount,

    @Schema(description = "작성 시각")
    LocalDateTime createdAt,

    @Schema(description = "수정 시각")
    LocalDateTime updatedAt
) {

}
