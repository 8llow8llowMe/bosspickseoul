package com.followfollowme.bosspickseoul.domainlayer.sharelink.adapter.in.web.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "공유 링크 생성 요청")
public record ShareLinkCreateRequest(

    @Schema(description = "공유 대상 화면 타입", example = "COMMERCIAL_ANALYSIS",
        allowableValues = {"COMMERCIAL_ANALYSIS", "DISTRICT_ANALYSIS", "ADMINISTRATION_ANALYSIS", "COMMERCIAL_COMPARISON", "AI_REPORT"})
    @NotBlank(message = ShareLinkValidationMessage.SHARE_TYPE_REQUIRED)
    String shareType,

    @Schema(description = "화면 진입 상태 payload (JSON 객체, 백엔드는 해석하지 않고 그대로 보관)",
        example = "{\"commercialCode\": \"3110008\", \"serviceCode\": \"CS100001\", \"periodCode\": \"20233\"}")
    @NotNull(message = ShareLinkValidationMessage.PAYLOAD_REQUIRED)
    JsonNode payload
) {

}
