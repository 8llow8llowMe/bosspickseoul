package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.member.application.exception.BookmarkValidationMessage;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "북마크 추가 요청 DTO")
public record MemberBookmarkCreateRequest(

    @NotNull(message = BookmarkValidationMessage.TARGET_TYPE_REQUIRED)
    @Schema(description = "북마크 대상 타입", example = "COMMERCIAL")
    MemberBookmarkTargetType targetType,

    @NotBlank(message = BookmarkValidationMessage.TARGET_CODE_REQUIRED)
    @Size(max = 20, message = BookmarkValidationMessage.TARGET_CODE_LENGTH_INVALID)
    @Schema(description = "북마크 대상 코드", example = "3110008")
    String targetCode,

    @NotBlank(message = BookmarkValidationMessage.TARGET_NAME_REQUIRED)
    @Size(max = 80, message = BookmarkValidationMessage.TARGET_NAME_LENGTH_INVALID)
    @Schema(description = "북마크 대상 이름 (스냅샷)", example = "강남역 상권")
    String targetName
) {

}
