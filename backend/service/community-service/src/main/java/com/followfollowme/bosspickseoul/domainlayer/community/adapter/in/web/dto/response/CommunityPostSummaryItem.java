package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "게시글 요약 항목 DTO")
public record CommunityPostSummaryItem(

    @Schema(description = "대표 이미지 URL (첨부 이미지가 없으면 null)", nullable = true)
    String thumbnailUrl,

    @Schema(description = "게시글 ID")
    String postId,

    @Schema(description = "작성자 회원 ID")
    String memberId,

    @Schema(description = "작성자 닉네임 — 탈퇴 회원은 '탈퇴회원', 회원 서비스 장애 시 null", nullable = true)
    String writerNickname,

    @Schema(description = "작성자 프로필 이미지 URL", nullable = true)
    String writerProfileImageUrl,

    @Schema(description = "대상 유형 메타데이터")
    CodeNameDescriptionMetadata targetType,

    @Schema(description = "대상 코드")
    String targetCode,

    @Schema(description = "대상 이름")
    String targetName,

    @Schema(description = "제목")
    String title,

    @Schema(description = "말머리 메타데이터 (말머리 없는 글은 null)", nullable = true)
    CodeNameDescriptionMetadata category,

    @Schema(description = "본문 미리보기")
    String previewContent,

    @Schema(description = "좋아요 수")
    long likeCount,

    @Schema(description = "댓글 수")
    long commentCount,

    @Schema(description = "조회 수")
    long viewCount,

    @Schema(description = "조회자 본인의 좋아요 여부 — 로그인 요청이면 true/false, 비로그인(토큰 없음)이면 null", nullable = true)
    Boolean liked,

    @Schema(description = "작성 시각")
    LocalDateTime createdAt
) {

}
