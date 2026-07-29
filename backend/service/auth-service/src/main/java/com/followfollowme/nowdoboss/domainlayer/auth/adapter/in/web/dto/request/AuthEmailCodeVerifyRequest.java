package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "이메일 인증코드 검증 요청 DTO")
public record AuthEmailCodeVerifyRequest(

    @Schema(description = "인증코드를 받은 이메일 주소", example = "user@example.com")
    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    String email,

    @Schema(description = "메일로 받은 인증코드", example = "A3K7MP2X")
    @NotBlank(message = "인증코드는 필수입니다.")
    String code
) {

}
