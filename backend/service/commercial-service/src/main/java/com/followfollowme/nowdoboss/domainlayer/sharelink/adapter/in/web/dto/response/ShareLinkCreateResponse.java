package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "공유 링크 생성 응답")
public record ShareLinkCreateResponse(

    @Schema(description = "단축 공유 코드. 프론트엔드가 공유용 URL(예: /s/{shareCode})을 조립할 때 사용", example = "a1B2c3D4")
    String shareCode,

    @Schema(description = "공유 대상 화면 타입 메타데이터")
    CodeNameDescriptionMetadata shareType,

    @Schema(description = "공유 링크 만료 시각", example = "2026-11-05T12:34:56")
    LocalDateTime expiresAt
) {

}
