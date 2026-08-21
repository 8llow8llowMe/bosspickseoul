package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberBookmarkTargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "북마크 추가 응답 DTO")
public record MemberBookmarkCreateResponse(

    @Schema(description = "북마크 아이디", example = "202507110001")
    Long bookmarkId,

    @Schema(description = "북마크 대상 타입", example = "COMMERCIAL")
    MemberBookmarkTargetType targetType,

    @Schema(description = "북마크 대상 코드", example = "3110008")
    String targetCode,

    @Schema(description = "북마크 대상 이름", example = "강남역 상권")
    String targetName,

    @Schema(description = "북마크 생성 시각")
    LocalDateTime createdAt
) {

}
