package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "상권 비교 게시글 초안 생성 요청 DTO")
public record CommunityCommercialComparisonDraftRequest(

    @Schema(description = "게시글 대상 타입", example = "COMMERCIAL")
    @NotBlank(message = "COMMUNITY_101:게시글 대상 타입은 필수입니다.")
    String targetType,

    @Schema(description = "게시글 대상 코드", example = "3110008")
    @NotBlank(message = "COMMUNITY_102:게시글 대상 코드는 필수입니다.")
    String targetCode,

    @Schema(description = "좌측 상권 코드", example = "3110008")
    @NotBlank(message = "COMMUNITY_113:좌측 상권 코드는 필수입니다.")
    String leftCommercialCode,

    @Schema(description = "우측 상권 코드", example = "3110012")
    @NotBlank(message = "COMMUNITY_114:우측 상권 코드는 필수입니다.")
    String rightCommercialCode,

    @Schema(description = "서비스 코드", example = "CS100001")
    @NotBlank(message = "COMMUNITY_115:서비스 코드는 필수입니다.")
    String serviceCode,

    @Schema(description = "기준 분기 코드", example = "20233")
    @NotBlank(message = "COMMUNITY_116:기준 분기 코드는 필수입니다.")
    String periodCode
) {
}
