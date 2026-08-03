package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberValidationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "내 회원 정보 수정 요청 DTO")
public record MemberMyInfoUpdateRequest(

    @Schema(description = "변경할 닉네임", example = "길동짱")
    @NotBlank(message = MemberValidationMessage.NICKNAME_REQUIRED)
    @Size(max = 10, message = MemberValidationMessage.NICKNAME_LENGTH_INVALID)
    String nickname,

    @Schema(description = "변경할 프로필 이미지 URL (미입력 시 프로필 이미지 제거)", example = "https://cdn.bosspickseoul.com/profiles/1.png")
    @Size(max = 255, message = MemberValidationMessage.PROFILE_IMAGE_URL_LENGTH_INVALID)
    String profileImageUrl
) {

}
