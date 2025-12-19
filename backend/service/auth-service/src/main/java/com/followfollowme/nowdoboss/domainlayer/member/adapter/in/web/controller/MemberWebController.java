package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
@Tag(name = "회원", description = "회원 관련 클라이언트 전용 API 입니다.")
public class MemberWebController {

    private final MemberWebUseCase memberWebUseCase;

    @Operation(
        summary = "일반 회원가입",
        description = "해당 서비스에 일반 회원가입하는 기능입니다."
    )
    @PostMapping("/signup")
    public ResponseEntity<Response<Void>> generalSignup(@Valid @RequestBody MemberGeneralSignupRequest request) {
        memberWebUseCase.generalSignup(MemberGeneralSignupCommand.from(request));
        return ResponseEntity.ok().body(Response.success());
    }
}
