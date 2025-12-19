package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.AuthGeneralLoginRequest;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.in.AuthWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
@Tag(name = "인증/인가", description = "인증/인가 관련 클라이언트에 제공하는 API 입니다.")
public class AuthWebController {

    private final AuthWebUseCase authWebUseCase;

    @Operation(
        summary = "일반 로그인",
        description = "이메일과 비밀번호를 입력하여 일반 로그인을 하는 기능입니다."
    )
    @PostMapping("/login")
    public ResponseEntity<Response<AuthGeneralLoginResponse>> loginWithCredentials(@RequestBody AuthGeneralLoginRequest request) {
        AuthGeneralLoginResponse response = authWebUseCase.generalLogin(AuthGeneralLoginCommand.from(request));
        return ResponseEntity.ok().body(Response.success(response));
    }
}
