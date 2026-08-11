package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "게시글 요약 항목 DTO")
public record CommunityPostSummaryItem(

    @Schema(description = "대표 이미지 URL (첨부 이미지가 없으면 null)", nullable = true)
    String thumbnailUrl,

    @Schema(description = "게시글 ID")
    long postId,

    @Schema(description = "작성자 회원 ID")
    long memberId,

    @Schema(description = "대상 유형 메타데이터")
    CodeNameDescriptionMetadata targetType,

    @Schema(description = "대상 코드")
    String targetCode,

    @Schema(description = "대상 이름")
    String targetName,

    @Schema(description = "제목")
    String title,

    @Schema(description = "본문 미리보기")
    String previewContent,

    @Schema(description = "좋아요 수")
    long likeCount,

    @Schema(description = "댓글 수")
    long commentCount,

    @Schema(description = "작성 시각")
    LocalDateTime createdAt
) {

}
