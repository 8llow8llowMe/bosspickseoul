package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(description = "게시글 수정 요청")
public record CommunityPostUpdateRequest(

    @Schema(description = "게시글 제목", example = "강남역 상권 분석 (수정)")
    @NotBlank(message = CommunityValidationMessage.TITLE_REQUIRED)
    @Size(max = 120, message = CommunityValidationMessage.TITLE_LENGTH_INVALID)
    String title,

    @Schema(description = "게시글 본문", example = "내용을 보강했습니다.")
    @NotBlank(message = CommunityValidationMessage.CONTENT_REQUIRED)
    @Size(max = 5000, message = CommunityValidationMessage.CONTENT_LENGTH_INVALID)
    String content,

    @Schema(description = "수정 후 남길 이미지 오브젝트 키 목록. 기존 이미지 중 여기 없는 항목은 삭제됩니다.",
        example = "[\"community/posts/202507110001/2026/08/3f2a9c11-0e4b-4a1f-9c3d-0b8e2f7a5d61.png\"]")
    @Size(max = 5, message = CommunityValidationMessage.IMAGE_COUNT_INVALID)
    List<String> imageKeys
) {

}
