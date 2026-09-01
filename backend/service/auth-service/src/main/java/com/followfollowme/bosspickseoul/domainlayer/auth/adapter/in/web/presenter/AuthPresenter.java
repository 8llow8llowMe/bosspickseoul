package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.item.AuthSessionItem;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthOAuthAuthorizeResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.AuthSessionsResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.RefreshSessionInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AuthPresenter {

    public AuthGeneralLoginResponse toGeneralLoginResponse(JwtTokenIssueInfo info) {
        return AuthGeneralLoginResponse.builder()
            .accessToken(info.accessToken())
            .memberId(String.valueOf(info.memberId()))
            .build();
    }

    public TokenReissueResponse toTokenReissueResponse(JwtTokenReissueInfo info) {
        return TokenReissueResponse.builder()
            .accessToken(info.accessToken())
            .build();
    }

    public AuthOAuthAuthorizeResponse toOAuthAuthorizeResponse(String authorizationUrl) {
        return AuthOAuthAuthorizeResponse.builder()
            .authorizationUrl(authorizationUrl)
            .build();
    }

    public AuthSessionsResponse toSessionsResponse(List<RefreshSessionInfo> sessions) {
        return AuthSessionsResponse.builder()
            .sessions(sessions.stream()
                .map(session -> AuthSessionItem.builder()
                    .sessionId(session.sessionId())
                    .deviceInfo(session.deviceInfo())
                    .createdAt(session.createdAt())
                    .lastUsedAt(session.lastUsedAt())
                    .current(session.current())
                    .build())
                .toList())
            .build();
    }
}
