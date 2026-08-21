package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
@Schema(description = "분석 보관함 저장 요청 DTO")
public record AnalysisBookmarkCreateRequest(

    @Schema(description = "분석 화면 타입 (공유 링크와 동일)", example = "COMMERCIAL_ANALYSIS",
        allowableValues = {"COMMERCIAL_ANALYSIS", "DISTRICT_ANALYSIS", "ADMINISTRATION_ANALYSIS", "COMMERCIAL_COMPARISON", "AI_REPORT"})
    @NotBlank(message = AnalysisBookmarkValidationMessage.SHARE_TYPE_REQUIRED)
    String shareType,

    @Schema(description = "화면 진입 상태 payload (공유 링크와 동일한 JSON 객체)",
        example = "{\"commercialCode\": \"3110008\", \"serviceCode\": \"CS100001\", \"periodCode\": \"20233\"}")
    @NotNull(message = AnalysisBookmarkValidationMessage.PAYLOAD_REQUIRED)
    JsonNode payload,

    @Schema(description = "보관함 이름 (선택, 50자 이하)", example = "역삼역 한식 후보", nullable = true)
    @Size(max = 50, message = AnalysisBookmarkValidationMessage.BOOKMARK_NAME_LENGTH)
    String bookmarkName
) {

}
