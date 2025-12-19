package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.global.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.global.exception.MemberException;
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
    private final MemberRepositoryPort memberRepositoryPort;

    public JwtTokenIssueInfo issueTokens(long memberId, SecurityRole role) {
        String accessToken = jwtAuthProvider.issueAccessToken(memberId, role);
        String refreshToken = jwtAuthProvider.issueRefreshToken();

        jwtTokenStorePort.save(memberId, refreshToken);

        return JwtTokenIssueInfo.of(memberId, role, accessToken);
    }

    public void revokeToken(long memberId) {
        jwtTokenStorePort.find(memberId)
            .ifPresent(token -> jwtTokenStorePort.delete(memberId));
    }

    public JwtTokenReissueInfo reissueTokens(long memberId) {
        // Redis 장애 시 자동으로 Optional.empty() 반환됨
        jwtTokenStorePort.find(memberId)
            .orElseThrow(() -> new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN));

        Member member = memberRepositoryPort.findById(memberId)
            .orElseThrow(() -> new MemberException(MemberErrorCode.NOT_FOUND_MEMBER));

        String newAccessToken = jwtAuthProvider.issueAccessToken(member.id(), member.role());
        String newRefreshToken = jwtAuthProvider.issueRefreshToken();

        jwtTokenStorePort.save(member.id(), newRefreshToken);

        return JwtTokenReissueInfo.of(newAccessToken);
    }
}
