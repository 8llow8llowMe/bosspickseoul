package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "미처리 신고 목록 응답")
public record ModerationReportsResponse(

    @Schema(description = "신고 목록")
    List<ModerationReportItem> reports
) {
}
