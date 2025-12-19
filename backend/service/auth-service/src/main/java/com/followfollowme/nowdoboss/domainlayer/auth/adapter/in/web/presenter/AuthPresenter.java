package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenIssueInfo;
import org.springframework.stereotype.Component;

@Component
public class AuthPresenter {

    public AuthGeneralLoginResponse toGeneralLoginResponse(JwtTokenIssueInfo info) {
        return AuthGeneralLoginResponse.builder()
            .accessToken(info.accessToken())
            .memberId(String.valueOf(info.memberId()))
            .build();
    }
}
