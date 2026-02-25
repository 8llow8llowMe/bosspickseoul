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
        // 1. 토큰 발급
        String accessToken = jwtAuthProvider.issueAccessToken(memberId, role);
        String refreshToken = jwtAuthProvider.issueRefreshToken(memberId);

        // 2. Refresh Token Redis 저장
        jwtTokenStorePort.save(memberId, refreshToken);

        return JwtTokenIssueInfo.of(memberId, role, accessToken, refreshToken);
    }

    public void revokeToken(long memberId) {
        jwtTokenStorePort.find(memberId)
            .ifPresent(token -> jwtTokenStorePort.delete(memberId));
    }

    public JwtTokenReissueInfo reissueTokens(String refreshToken) {
        // 1. Refresh Token 서명/만료 검증 및 memberId 추출
        if (refreshToken == null) {
            throw new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN);
        }
        long memberId = jwtAuthProvider.parseRefreshToken(refreshToken);

        // 2. Redis 저장 토큰과 비교
        String storedToken = jwtTokenStorePort.find(memberId)
            .orElseThrow(() -> new AuthException(AuthErrorCode.EXPIRED_REFRESH_TOKEN));

        if (!storedToken.equals(refreshToken)) {
            throw new AuthException(AuthErrorCode.INVALID_REFRESH_TOKEN);
        }

        // 3. 회원 조회
        Member member = memberRepositoryPort.findById(memberId)
            .orElseThrow(() -> new MemberException(MemberErrorCode.NOT_FOUND_MEMBER));

        // 4. 새로운 토큰 발급 및 Rotation 적용
        String newAccessToken = jwtAuthProvider.issueAccessToken(member.id(), member.role());
        String newRefreshToken = jwtAuthProvider.issueRefreshToken(member.id());

        jwtTokenStorePort.save(member.id(), newRefreshToken);

        return JwtTokenReissueInfo.of(newAccessToken, newRefreshToken);
    }
}
