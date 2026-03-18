package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.item.CommunityBoardTargetItem;
import com.followfollowme.nowdoboss.persistence.dto.SliceResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "게시글 목록 응답")
public record CommunityPostListResponse(

    @Schema(description = "게시판 대상 정보 (대상 타입/코드 지정 시에만 포함)", nullable = true)
    CommunityBoardTargetItem board,

    @Schema(description = "게시글 목록")
    SliceResponse<CommunityPostSummaryItem> posts
) {

}
