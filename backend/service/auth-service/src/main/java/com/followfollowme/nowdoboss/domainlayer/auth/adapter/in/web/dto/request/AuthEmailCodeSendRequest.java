package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "이메일 인증코드 발송 요청 DTO")
public record AuthEmailCodeSendRequest(

    @Schema(description = "인증코드를 받을 이메일 주소", example = "user@example.com")
    @NotBlank(message = "AUTH_101:이메일은 필수입니다.")
    @Email(message = "AUTH_102:이메일 형식이 올바르지 않습니다.")
    String email
) {

}
