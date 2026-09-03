package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.item.CommunityPostImageItem;
import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "게시글 상세 응답 DTO")
public record CommunityPostDetailResponse(

    @Schema(description = "첨부 이미지 목록 (없으면 빈 배열)")
    List<CommunityPostImageItem> images,

    @Schema(description = "게시글 ID")
    String postId,

    @Schema(description = "작성자 회원 ID")
    String memberId,

    @Schema(description = "대상 유형 메타데이터")
    CodeNameDescriptionMetadata targetType,

    @Schema(description = "대상 코드")
    String targetCode,

    @Schema(description = "대상 이름")
    String targetName,

    @Schema(description = "제목")
    String title,

    @Schema(description = "본문")
    String content,

    @Schema(description = "분석 첨부 타입 메타데이터 (없으면 null)", nullable = true)
    CodeNameDescriptionMetadata analysisType,

    @Schema(description = "분석 참조 코드 (없으면 null)", nullable = true)
    String analysisRefCode,

    @Schema(description = "분석 참조 표시명 (없으면 null)", nullable = true)
    String analysisRefName,

    @Schema(description = "분석 스냅샷 키 (없으면 null)", nullable = true)
    String analysisSnapshotKey,

    @Schema(description = "좋아요 수")
    long likeCount,

    @Schema(description = "댓글 수")
    long commentCount,

    @Schema(description = "조회 수")
    long viewCount,

    @Schema(description = "작성 시각")
    LocalDateTime createdAt,

    @Schema(description = "수정 시각")
    LocalDateTime updatedAt
) {

}
