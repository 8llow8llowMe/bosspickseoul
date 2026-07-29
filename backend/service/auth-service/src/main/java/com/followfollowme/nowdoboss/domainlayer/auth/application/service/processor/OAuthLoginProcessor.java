package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.OAuthStateStorePort;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.nowdoboss.domainlayer.auth.application.service.oauth.OAuthAuthorizationUrlRouter;
import com.followfollowme.nowdoboss.domainlayer.auth.application.service.oauth.OAuthMemberQueryRouter;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthLoginProcessor {

    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final int STATE_BYTE_LENGTH = 16;

    private final OAuthAuthorizationUrlRouter authorizationUrlRouter;
    private final OAuthMemberQueryRouter memberQueryRouter;
    private final OAuthStateStorePort oAuthStateStorePort;
    private final MemberRepositoryPort memberRepositoryPort;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * CSRF 방어용 일회성 state를 발급해 인가 URL에 포함시킨다.
     */
    public String generateAuthorizationUrl(OAuthProvider provider) {
        byte[] stateBytes = new byte[STATE_BYTE_LENGTH];
        secureRandom.nextBytes(stateBytes);
        String state = HexFormat.of().formatHex(stateBytes);

        oAuthStateStorePort.save(state, provider, STATE_TTL);
        return authorizationUrlRouter.generateUrl(provider, state);
    }

    public GeneralLoginInfo login(OAuthProvider provider, String authCode, String state) {
        // 1. state 검증(일회성 소비) — 우리가 발급한 요청인지, provider가 바뀌지 않았는지 확인
        validateState(provider, state);

        // 2. provider로부터 사용자 프로필 조회
        OAuthMemberQueryResult oAuthMember = memberQueryRouter.fetchMember(provider, authCode, state);
        if (!StringUtils.hasText(oAuthMember.email())) {
            throw new AuthException(AuthErrorCode.OAUTH_EMAIL_REQUIRED);
        }
        String email = EmailVerificationProcessor.normalize(oAuthMember.email());

        // 3. 기존 회원 조회(상태/provider 검증) 또는 신규 생성
        Member member = memberRepositoryPort.findByEmail(email)
            .map(existing -> validateExistingMember(existing, provider))
            .orElseGet(() -> createOAuthMember(provider, email, oAuthMember));

        return GeneralLoginInfo.of(member.id(), member.role());
    }

    private void validateState(OAuthProvider provider, String state) {
        if (!StringUtils.hasText(state)) {
            throw new AuthException(AuthErrorCode.INVALID_OAUTH_STATE);
        }

        OAuthProvider savedProvider = oAuthStateStorePort.consume(state)
            .orElseThrow(() -> new AuthException(AuthErrorCode.INVALID_OAUTH_STATE));

        if (savedProvider != provider) {
            throw new AuthException(AuthErrorCode.INVALID_OAUTH_STATE);
        }
    }

    private Member validateExistingMember(Member existing, OAuthProvider provider) {
        // 상태 먼저 확인 — 탈퇴/정지 회원은 소셜 로그인도 차단
        switch (existing.status()) {
            case WITHDRAWN -> throw new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN);
            case SUSPENDED -> throw new MemberException(MemberErrorCode.MEMBER_SUSPENDED);
            case ACTIVE -> {
            } // 정상
        }

        // 일반 계정이면 소셜 계정으로 자동 연결 (provider가 이메일 소유를 검증했다는 전제)
        if (existing.provider() == null) {
            log.info("[OAuthLoginProcessor] 일반 계정을 소셜 계정으로 연결: memberId={}, provider={}", existing.id(), provider);
            return memberRepositoryPort.save(existing.withProvider(provider));
        }

        // 다른 provider로 가입된 계정이면 차단
        if (existing.provider() != provider) {
            throw new AuthException(AuthErrorCode.UNMATCHED_OAUTH_PROVIDER, existing.provider().getDescription());
        }
        return existing;
    }

    private Member createOAuthMember(OAuthProvider provider, String email, OAuthMemberQueryResult oAuthMember) {
        Member newMember = Member.builder()
            .id(snowflakeIdGenerator.generateId())
            .email(email)
            .password(null)
            .name(StringUtils.hasText(oAuthMember.name()) ? oAuthMember.name() : oAuthMember.nickname())
            .nickname(oAuthMember.nickname())
            .profileImageUrl(oAuthMember.profileImageUrl())
            .role(SecurityRole.USER)
            .provider(provider)
            .status(MemberStatus.ACTIVE)
            .build();

        return memberRepositoryPort.save(newMember);
    }
}
