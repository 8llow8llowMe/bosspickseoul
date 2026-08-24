package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
@Schema(description = "분석 보관함 이름 수정 요청 DTO")
public record AnalysisBookmarkNameUpdateRequest(

    @Schema(description = "새 보관함 이름 (null 또는 공백이면 이름을 제거한다)", example = "역삼역 한식 후보", nullable = true)
    @Size(max = 50, message = AnalysisBookmarkValidationMessage.BOOKMARK_NAME_LENGTH)
    String bookmarkName
) {

}
