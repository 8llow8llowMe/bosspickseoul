package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "게시글 이미지 업로드 응답 DTO")
public record CommunityPostImageUploadResponse(

    @Schema(description = "오브젝트 키. 게시글 작성/수정 요청의 imageKeys 에 그대로 담아 보냅니다.",
        example = "community/posts/202507110001/2026/08/3f2a9c11-0e4b-4a1f-9c3d-0b8e2f7a5d61.png")
    String imageKey,

    @Schema(description = "업로드 직후 미리보기용 공개 URL",
        example = "https://minio.8llow8llowme.com/bosspickseoul/community/posts/202507110001/2026/08/3f2a9c11.png")
    String imageUrl
) {

}
