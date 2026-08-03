package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.application.exception.CommunityValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "게시글 작성 요청")
public record CommunityPostCreateRequest(

    @Schema(description = "대상 타입", example = "COMMERCIAL")
    @NotBlank(message = CommunityValidationMessage.TARGET_TYPE_REQUIRED)
    String targetType,

    @Schema(description = "대상 코드", example = "3110008")
    @NotBlank(message = CommunityValidationMessage.TARGET_CODE_REQUIRED)
    String targetCode,

    @Schema(description = "게시글 제목", example = "강남역 상권 분석")
    @NotBlank(message = CommunityValidationMessage.TITLE_REQUIRED)
    @Size(max = 120, message = CommunityValidationMessage.TITLE_LENGTH_INVALID)
    String title,

    @Schema(description = "게시글 본문", example = "강남역 상권에 대해 알아보겠습니다.")
    @NotBlank(message = CommunityValidationMessage.CONTENT_REQUIRED)
    @Size(max = 5000, message = CommunityValidationMessage.CONTENT_LENGTH_INVALID)
    String content
) {

}
