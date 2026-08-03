package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "게시글 작성 요청")
public record CommunityPostCreateRequest(

    @Schema(description = "대상 타입", example = "COMMERCIAL")
    @NotBlank(message = "COMMUNITY_101:게시글 대상 타입은 필수입니다.")
    String targetType,

    @Schema(description = "대상 코드", example = "3110008")
    @NotBlank(message = "COMMUNITY_102:게시글 대상 코드는 필수입니다.")
    String targetCode,

    @Schema(description = "게시글 제목", example = "강남역 상권 분석")
    @NotBlank(message = "COMMUNITY_103:제목은 필수입니다.")
    @Size(max = 120, message = "COMMUNITY_104:제목은 120자 이하만 가능합니다.")
    String title,

    @Schema(description = "게시글 본문", example = "강남역 상권에 대해 알아보겠습니다.")
    @NotBlank(message = "COMMUNITY_105:본문은 필수입니다.")
    @Size(max = 5000, message = "COMMUNITY_106:본문은 5000자 이하만 가능합니다.")
    String content
) {

}
