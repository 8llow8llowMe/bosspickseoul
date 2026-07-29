package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "내 회원 정보 수정 요청 DTO")
public record MemberMyInfoUpdateRequest(

    @Schema(description = "변경할 닉네임", example = "길동짱")
    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(max = 10, message = "닉네임은 10자 이하만 가능합니다.")
    String nickname,

    @Schema(description = "변경할 프로필 이미지 URL (미입력 시 프로필 이미지 제거)", example = "https://cdn.bosspickseoul.com/profiles/1.png")
    @Size(max = 255, message = "프로필 이미지 URL은 255자 이하만 가능합니다.")
    String profileImageUrl
) {

}
