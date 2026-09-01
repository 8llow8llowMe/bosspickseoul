package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "개발용 즉시 가입 응답 DTO — 생성된 계정으로 바로 로그인 테스트할 수 있게 식별 정보를 돌려준다")
public record MemberDevSignupResponse(

    @Schema(description = "생성된 회원 아이디", example = "202507110001")
    String memberId,

    @Schema(description = "가입된 이메일 (정규화 적용됨)", example = "tester@example.com")
    String email
) {

}
