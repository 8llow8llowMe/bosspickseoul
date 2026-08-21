package com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.item;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "분석 보관함 항목 DTO")
public record AnalysisBookmarkItem(

    @Schema(description = "보관함 항목 아이디", example = "7345678901234567890")
    long bookmarkId,

    @Schema(description = "분석 화면 타입 메타데이터")
    CodeNameDescriptionMetadata shareType,

    @Schema(description = "화면 진입 상태 payload (저장 시 JSON 객체 그대로) — 공유 링크 해석과 동일하게 화면을 복원한다",
        example = "{\"commercialCode\": \"3110008\", \"serviceCode\": \"CS100001\", \"periodCode\": \"20233\"}")
    JsonNode payload,

    @Schema(description = "보관함 이름 (미지정이면 null)", nullable = true)
    String bookmarkName,

    @Schema(description = "저장 시각")
    LocalDateTime createdAt
) {

}
