package com.followfollowme.bosspickseoul.domainlayer.auth.application.command;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.request.AuthGeneralLoginRequest;
import lombok.Builder;

@Builder
public record AuthGeneralLoginCommand(
    String email,
    String password,
    // IP 기준 실패 상한(AUTH_020) 키. 요청 헤더에서 얻으므로 위조 가능하며 rate limit 키로만 쓴다.
    String clientIp
) {

    public static AuthGeneralLoginCommand from(AuthGeneralLoginRequest request, String clientIp) {
        return AuthGeneralLoginCommand.builder()
            .email(request.email())
            .password(request.password())
            .clientIp(clientIp)
            .build();
    }
}
