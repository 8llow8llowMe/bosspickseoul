package com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.bosspickseoul.domainlayer.member.adapter.in.web.dto.response.MemberDevSignupResponse;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.in.MemberDevSignupUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개발/테스트 전용 컨트롤러 — prod 프로필에서는 빈이 등록되지 않아 이 경로 자체가 404 다.
 * Swagger 도 prod 에서는 꺼져 있어 노출 경로가 없다.
 */
@Profile("!prod")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
@Tag(name = "개발용 (prod 미노출)", description = "개발/테스트 편의 API. 운영 프로필에서는 존재하지 않습니다.")
public class MemberDevSignupWebController {

    private final MemberDevSignupUseCase memberDevSignupUseCase;

    @Operation(
        summary = "[개발용] 즉시 회원가입 (이메일 인증 생략)",
        description = """
            이메일 인증코드 검증 없이 계정을 바로 만듭니다. 테스트 계정 생성 전용이며,
            비밀번호 규칙·이메일 중복 검증(409 MEMBER_001)은 일반 가입과 동일하게 적용됩니다.
            응답의 email/비밀번호로 바로 POST /api/v1/auth/login 을 호출해 테스트할 수 있습니다.
            prod 프로필에서는 이 API 가 등록되지 않습니다."""
    )
    @PostMapping("/signup/dev")
    public ResponseEntity<Response<MemberDevSignupResponse>> devSignup(
        @Valid @RequestBody MemberGeneralSignupRequest request
    ) {
        return ResponseEntity.ok().body(Response.success(memberDevSignupUseCase.devSignup(request)));
    }
}
