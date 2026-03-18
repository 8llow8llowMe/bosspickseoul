package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "게시글 작성 요청")
public record CommunityPostCreateRequest(

    @Schema(description = "대상 타입", example = "COMMERCIAL")
    @NotBlank
    String targetType,

    @Schema(description = "대상 코드", example = "3110008")
    @NotBlank
    String targetCode,

    @Schema(description = "게시글 제목", example = "강남역 상권 분석")
    @NotBlank
    @Size(max = 120)
    String title,

    @Schema(description = "게시글 본문", example = "강남역 상권에 대해 알아보겠습니다.")
    @NotBlank
    @Size(max = 5000)
    String content
) {

}
