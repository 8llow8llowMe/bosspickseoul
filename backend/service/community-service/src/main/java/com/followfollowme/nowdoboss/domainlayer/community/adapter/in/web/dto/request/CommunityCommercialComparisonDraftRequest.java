package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "상권 비교 게시글 초안 생성 요청 DTO")
public record CommunityCommercialComparisonDraftRequest(

    @Schema(description = "게시글 대상 타입", example = "COMMERCIAL")
    @NotBlank(message = CommunityValidationMessage.TARGET_TYPE_REQUIRED)
    String targetType,

    @Schema(description = "게시글 대상 코드", example = "3110008")
    @NotBlank(message = CommunityValidationMessage.TARGET_CODE_REQUIRED)
    String targetCode,

    @Schema(description = "좌측 상권 코드", example = "3110008")
    @NotBlank(message = CommunityValidationMessage.LEFT_COMMERCIAL_CODE_REQUIRED)
    String leftCommercialCode,

    @Schema(description = "우측 상권 코드", example = "3110012")
    @NotBlank(message = CommunityValidationMessage.RIGHT_COMMERCIAL_CODE_REQUIRED)
    String rightCommercialCode,

    @Schema(description = "서비스 코드", example = "CS100001")
    @NotBlank(message = CommunityValidationMessage.SERVICE_CODE_REQUIRED)
    String serviceCode,

    @Schema(description = "기준 분기 코드", example = "20233")
    @NotBlank(message = CommunityValidationMessage.PERIOD_CODE_REQUIRED)
    String periodCode
) {
}
