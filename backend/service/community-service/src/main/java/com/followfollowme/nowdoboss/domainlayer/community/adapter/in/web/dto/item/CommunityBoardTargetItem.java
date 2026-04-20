package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "커뮤니티 게시판 대상 정보 항목 DTO")
public record CommunityBoardTargetItem(

    @Schema(description = "대상 유형 메타데이터")
    CodeNameDescriptionMetadata targetType,

    @Schema(description = "대상 코드", example = "3110008")
    String targetCode,

    @Schema(description = "대상 이름", example = "강남역 상권")
    String targetName
) {

}
