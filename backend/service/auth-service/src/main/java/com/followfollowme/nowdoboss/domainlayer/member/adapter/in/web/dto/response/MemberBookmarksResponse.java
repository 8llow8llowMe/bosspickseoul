package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.item.MemberBookmarkItem;
import com.followfollowme.nowdoboss.persistence.dto.SliceResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "북마크 목록 응답 DTO")
public record MemberBookmarksResponse(

    @Schema(description = "북마크 목록 (최신순, 커서 페이지네이션)")
    SliceResponse<MemberBookmarkItem> bookmarks
) {

}
