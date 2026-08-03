package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "비밀번호 변경 요청 DTO")
public record MemberPasswordChangeRequest(

    @Schema(description = "현재 비밀번호", example = "password123!")
    @NotBlank(message = "MEMBER_111:현재 비밀번호는 필수입니다.")
    String currentPassword,

    @Schema(description = "새 비밀번호 (영문자, 숫자, 특수문자 포함 8~20자)", example = "newPassword456!")
    @NotBlank(message = "MEMBER_112:새 비밀번호는 필수입니다.")
    @Size(min = 8, max = 20, message = "MEMBER_104:비밀번호는 8자 이상 20자 이하여야 합니다.")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()\\-_=+\\[\\]{};:'\",.<>/?\\\\|])\\S{8,20}$",
        message = "MEMBER_105:비밀번호는 공백 없이 영문자, 숫자, 특수문자를 포함한 8~20자여야 합니다."
    )
    String newPassword
) {

}
