package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.item.AnalysisBookmarkItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "분석 보관함 저장 응답 DTO")
public record AnalysisBookmarkCreateResponse(

    @Schema(description = "저장된 보관함 항목")
    AnalysisBookmarkItem bookmark
) {

}
