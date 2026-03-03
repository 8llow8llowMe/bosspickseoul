package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
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
    private final JwtAuthProperties jwtAuthProperties;
    private final JwtTokenStorePort jwtTokenStorePort;
    private final MemberRepositoryPort memberRepositoryPort;

    public JwtTokenIssueInfo issueTokens(long memberId, SecurityRole role) {
        // 1. Issue token pair
        String accessToken = jwtAuthProvider.issueAccessToken(memberId, role);
        String refreshToken = jwtAuthProvider.issueRefreshToken(memberId);

        // 2. Save refresh token to Redis
        jwtTokenStorePort.save(memberId, refreshToken);

        return JwtTokenIssueInfo.of(memberId, role, accessToken, refreshToken);
    }

    public void revokeToken(long memberId, String tokenId) {
        // 1. Delete refresh token
        jwtTokenStorePort.delete(memberId);

        // 2. Register access token id blacklist
        if (tokenId == null || tokenId.isBlank()) {
            log.warn("[JwtTokenProcessor] 로그아웃 요청에 tokenId 누락: memberId={}", memberId);
            return;
        }

        jwtTokenStorePort.saveAccessTokenIdBlacklist(tokenId, jwtAuthProperties.accessExpiration());
    }

    public JwtTokenReissueInfo reissueTokens(String refreshToken) {
        // 1. Validate refresh token and extract member id
        if (refreshToken == null) {
            throw new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN);
        }
        long memberId = jwtAuthProvider.parseRefreshToken(refreshToken);

        // 2. Compare token with Redis value
        String storedToken = jwtTokenStorePort.find(memberId)
            .orElseThrow(() -> new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN));

        if (!storedToken.equals(refreshToken)) {
            throw new AuthException(AuthErrorCode.INVALID_REFRESH_TOKEN);
        }

        // 3. Lookup member
        Member member = memberRepositoryPort.findById(memberId)
            .orElseThrow(() -> new MemberException(MemberErrorCode.NOT_FOUND_MEMBER));

        // 4. Issue and rotate tokens
        String newAccessToken = jwtAuthProvider.issueAccessToken(member.id(), member.role());
        String newRefreshToken = jwtAuthProvider.issueRefreshToken(member.id());
        jwtTokenStorePort.save(member.id(), newRefreshToken);

        return JwtTokenReissueInfo.of(newAccessToken, newRefreshToken);
    }
}
