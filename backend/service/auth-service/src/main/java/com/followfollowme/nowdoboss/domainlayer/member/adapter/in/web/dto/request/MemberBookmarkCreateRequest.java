package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "북마크 추가 요청 DTO")
public record MemberBookmarkCreateRequest(

    @NotNull
    @Schema(description = "북마크 대상 타입", example = "COMMERCIAL")
    MemberBookmarkTargetType targetType,

    @NotBlank
    @Size(max = 20)
    @Schema(description = "북마크 대상 코드", example = "3110008")
    String targetCode,

    @NotBlank
    @Size(max = 80)
    @Schema(description = "북마크 대상 이름 (스냅샷)", example = "강남역 상권")
    String targetName
) {

}
