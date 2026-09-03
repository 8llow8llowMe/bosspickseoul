package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(description = "게시글 작성 요청")
public record CommunityPostCreateRequest(

    @Schema(description = "대상 타입", example = "COMMERCIAL")
    @NotBlank(message = CommunityValidationMessage.TARGET_TYPE_REQUIRED)
    String targetType,

    @Schema(description = "대상 코드", example = "3110008")
    @NotBlank(message = CommunityValidationMessage.TARGET_CODE_REQUIRED)
    String targetCode,

    @Schema(description = "게시글 제목", example = "강남역 상권 분석")
    @NotBlank(message = CommunityValidationMessage.TITLE_REQUIRED)
    @Size(max = 120, message = CommunityValidationMessage.TITLE_LENGTH_INVALID)
    String title,

    @Schema(description = "게시글 본문", example = "강남역 상권에 대해 알아보겠습니다.")
    @NotBlank(message = CommunityValidationMessage.CONTENT_REQUIRED)
    @Size(max = 5000, message = CommunityValidationMessage.CONTENT_LENGTH_INVALID)
    String content,

    @Schema(description = "첨부 이미지 오브젝트 키 목록 (이미지 업로드 API 응답의 imageKey). 배열 순서가 노출 순서가 됩니다.",
        example = "[\"community/posts/202507110001/2026/08/3f2a9c11-0e4b-4a1f-9c3d-0b8e2f7a5d61.png\"]")
    @Size(max = 5, message = CommunityValidationMessage.IMAGE_COUNT_INVALID)
    List<String> imageKeys,

    @Schema(description = "분석 첨부 타입 (선택 — 비교 초안 응답의 analysisType.code 를 그대로 전달)",
        example = "COMMERCIAL_COMPARISON", nullable = true)
    String analysisType,

    @Schema(description = "분석 참조 코드 (선택 — 초안 응답의 analysisRefCode 그대로)", nullable = true)
    @Size(max = 100, message = CommunityValidationMessage.ANALYSIS_REF_CODE_LENGTH_INVALID)
    String analysisRefCode,

    @Schema(description = "분석 참조 표시명 (선택 — 초안 응답의 analysisRefName 그대로)", nullable = true)
    @Size(max = 200, message = CommunityValidationMessage.ANALYSIS_REF_NAME_LENGTH_INVALID)
    String analysisRefName,

    @Schema(description = "분석 스냅샷 키 (선택 — 초안 응답의 analysisSnapshotKey 그대로)", nullable = true)
    @Size(max = 200, message = CommunityValidationMessage.ANALYSIS_SNAPSHOT_KEY_LENGTH_INVALID)
    String analysisSnapshotKey
) {

}
