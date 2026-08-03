package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "북마크 추가 요청 DTO")
public record MemberBookmarkCreateRequest(

    @NotNull(message = "BOOKMARK_101:북마크 대상 타입은 필수입니다.")
    @Schema(description = "북마크 대상 타입", example = "COMMERCIAL")
    MemberBookmarkTargetType targetType,

    @NotBlank(message = "BOOKMARK_102:북마크 대상 코드는 필수입니다.")
    @Size(max = 20, message = "BOOKMARK_103:북마크 대상 코드는 20자 이하만 가능합니다.")
    @Schema(description = "북마크 대상 코드", example = "3110008")
    String targetCode,

    @NotBlank(message = "BOOKMARK_104:북마크 대상 이름은 필수입니다.")
    @Size(max = 80, message = "BOOKMARK_105:북마크 대상 이름은 80자 이하만 가능합니다.")
    @Schema(description = "북마크 대상 이름 (스냅샷)", example = "강남역 상권")
    String targetName
) {

}
