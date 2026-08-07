package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "공유 링크 해석 응답")
public record ShareLinkResolveResponse(

    @Schema(description = "공유 대상 화면 타입 메타데이터")
    CodeNameDescriptionMetadata shareType,

    @Schema(description = "화면 진입 상태 payload (생성 시 저장한 JSON 객체 그대로)",
        example = "{\"commercialCode\": \"3110008\", \"serviceCode\": \"CS100001\", \"periodCode\": \"20233\"}")
    JsonNode payload,

    @Schema(description = "공유 링크 생성 시각", example = "2026-08-07T12:34:56")
    LocalDateTime createdAt,

    @Schema(description = "공유 링크 만료 시각", example = "2026-11-05T12:34:56")
    LocalDateTime expiresAt
) {

}
