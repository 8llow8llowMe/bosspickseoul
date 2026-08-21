package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.item.AnalysisBookmarkItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "분석 보관함 목록 응답 DTO")
public record AnalysisBookmarksResponse(

    @Schema(description = "보관함 목록 (최신순)")
    List<AnalysisBookmarkItem> bookmarks,

    @Schema(description = "현재 페이지 (0부터)", example = "0")
    int page,

    @Schema(description = "페이지 크기", example = "10")
    int size,

    @Schema(description = "전체 건수", example = "12")
    long totalElements,

    @Schema(description = "전체 페이지 수", example = "2")
    int totalPages
) {

}
