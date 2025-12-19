package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "토큰 재발급 요청 DTO")
public record TokenReissueRequest(

    @Schema(description = "회원 아이디", example = "202507110001")
    String memberId
) {

}
