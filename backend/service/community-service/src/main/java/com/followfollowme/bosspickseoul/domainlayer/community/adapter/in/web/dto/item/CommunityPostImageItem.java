package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "게시글 첨부 이미지 항목")
public record CommunityPostImageItem(

    @Schema(description = "오브젝트 키 (게시글 수정 시 그대로 다시 보내면 유지됩니다)",
        example = "community/posts/202507110001/2026/08/3f2a9c11-0e4b-4a1f-9c3d-0b8e2f7a5d61.png")
    String imageKey,

    @Schema(description = "이미지 공개 URL",
        example = "https://minio.8llow8llowme.com/bosspickseoul/community/posts/202507110001/2026/08/3f2a9c11.png")
    String imageUrl,

    @Schema(description = "노출 순서 (0부터)", example = "0")
    int sortOrder
) {

}
