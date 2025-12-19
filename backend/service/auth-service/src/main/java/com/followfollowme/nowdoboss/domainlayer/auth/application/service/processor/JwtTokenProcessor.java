package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProvider;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class JwtTokenProcessor {

    private final JwtAuthProvider jwtAuthProvider;
    private final JwtTokenStorePort jwtTokenStorePort;

    public JwtTokenIssueInfo issueTokens(long memberId, SecurityRole role) {
        String accessToken = jwtAuthProvider.issueAccessToken(memberId, role);
        String refreshToken = jwtAuthProvider.issueRefreshToken();

        jwtTokenStorePort.save(memberId, refreshToken);

        return JwtTokenIssueInfo.of(memberId, role, accessToken);
    }
}
