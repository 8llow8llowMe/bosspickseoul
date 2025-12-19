package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "일반 회원가입 요청 DTO")
public record MemberSignupRequest(

    @Schema(description = "이메일 주소", example = "user@example.com")
    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    String email,

    @Schema(description = "비밀번호 (영문자, 숫자, 특수문자 포함 8~20자)", example = "password123!")
    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, max = 20, message = "비밀번호는 8자 이상 20자 이하여야 합니다.")
    @Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()\\-_=+\\[\\]{};:'\",.<>/?\\\\|])\\S{8,20}$",
        message = "비밀번호는 공백 없이 영문자, 숫자, 특수문자를 포함한 8~20자여야 합니다."
    )
    String password,

    @Schema(description = "회원 이름", example = "홍길동")
    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 10, message = "이름은 10자 이하만 가능합니다.")
    String name,

    @Schema(description = "회원 닉네임", example = "길동짱")
    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(max = 10, message = "닉네임은 10자 이하만 가능합니다.")
    String nickname
) {

}
