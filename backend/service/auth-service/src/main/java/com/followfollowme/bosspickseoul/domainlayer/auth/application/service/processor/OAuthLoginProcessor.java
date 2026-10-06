package com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.OAuthCallbackInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthConsentSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthSignupConsent;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.MailSendPort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.OAuthStateStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.SignupConsentRecordPort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthStateQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.oauth.OAuthAuthorizationUrlRouter;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.oauth.OAuthMemberQueryRouter;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.global.properties.LegalProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    private final SignupConsentRecordPort signupConsentRecordPort;
    private final MailSendPort mailSendPort;
    private final SnowflakeIdGenerator snowflakeIdGenerator;
    private final LegalProperties legalProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * CSRF 방어용 일회성 state 를 발급해 인가 URL 에 포함시킨다.
     *
     * <p>소셜 첫 가입 동의를 <b>여기서</b> 받아 state 와 함께 보관한다. 콜백에서 받지 않는 이유는 OAuth 인가코드가 1회용이기
     * 때문이다 — 콜백에서 동의 누락으로 거부하면 같은 코드로 재시도할 수 없다. 동의 없이 부르는 것도 허용한다. 이미 가입한
     * 회원의 로그인에는 동의가 필요 없고, 인가 전에는 신규인지 기존인지 알 수 없다.
     *
     * <p>동의 플래그와 함께 <b>지금의 문서 판과 지금 시각</b>을 state 에 고정한다. 이력은 콜백에서 남기지만 동의한 순간은
     * 여기다. 콜백까지 최대 10분 사이에 배포로 판 설정이 바뀌면, 콜백 시점의 판으로 남긴 이력은 사용자가 보지 않은 판을
     * 가리키게 된다.
     */
    public String generateAuthorizationUrl(OAuthProvider provider, OAuthSignupConsent consent) {
        byte[] stateBytes = new byte[STATE_BYTE_LENGTH];
        secureRandom.nextBytes(stateBytes);
        String state = HexFormat.of().formatHex(stateBytes);

        OAuthConsentSnapshot snapshot = new OAuthConsentSnapshot(
            consent, legalProperties.termsVersion(), legalProperties.privacyVersion(), LocalDateTime.now());
        oAuthStateStorePort.save(state, provider, snapshot, STATE_TTL);
        return authorizationUrlRouter.generateUrl(provider, state);
    }

    /**
     * provider 왕복(HTTP)만 담당한다. DB 트랜잭션 밖에서 호출해 커넥션 점유를 피한다.
     *
     * <p>state 소비는 일회성이라 여기서만 동의를 꺼낼 수 있다. 다음 단계(회원 조회/생성)는 별도 트랜잭션이므로 프로필과 동의를
     * 함께 묶어 돌려준다.
     */
    public OAuthCallbackInfo fetchOAuthMember(OAuthProvider provider, String authCode, String state) {
        // 1. state 검증(일회성 소비) — 우리가 발급한 요청인지, provider 가 바뀌지 않았는지 확인하고 인가 전에 받아 둔 동의를 꺼낸다
        OAuthConsentSnapshot consent = validateState(provider, state);

        // 2. provider 로부터 사용자 프로필 조회 및 필수 항목(부분 동의) 검증
        OAuthMemberQueryResult oAuthMember = memberQueryRouter.fetchMember(provider, authCode, state);
        validateRequiredProfile(oAuthMember);

        return new OAuthCallbackInfo(oAuthMember, consent);
    }

    /**
     * 조회한 프로필로 회원을 조회/생성한다. 외부 HTTP 를 포함하지 않는 이 구간만 트랜잭션 대상이라, 신규 회원과 그 동의 이력은
     * 한 트랜잭션에 묶여 함께 커밋되거나 함께 사라진다.
     *
     * <p>동의는 <b>신규 생성 경로에서만</b> 본다. 이미 가입한 회원에게는 소급 동의를 요구하지 않는다 — 이력이 없는 기존 회원은
     * "동의 도입 전 가입" 으로 보고 로그인을 그대로 통과시킨다.
     */
    @Transactional
    public GeneralLoginInfo login(OAuthProvider provider, OAuthCallbackInfo callbackInfo) {
        OAuthMemberQueryResult oAuthMember = callbackInfo.member();
        String email = EmailVerificationProcessor.normalize(oAuthMember.email());

        Member member = memberRepositoryPort.findByEmail(email)
            .map(existing -> resolveExistingMember(existing, provider, oAuthMember))
            .orElseGet(() -> signupOAuthMember(provider, email, oAuthMember, callbackInfo.consent()));

        return GeneralLoginInfo.of(member.id(), member.role());
    }

    private void validateRequiredProfile(OAuthMemberQueryResult oAuthMember) {
        if (!StringUtils.hasText(oAuthMember.email())) {
            throw new AuthException(AuthErrorCode.OAUTH_EMAIL_REQUIRED);
        }

        // 회원 식별의 기준이 이메일이므로, provider가 소유를 검증하지 않은 이메일은 신뢰하지 않는다.
        if (!oAuthMember.emailVerified()) {
            throw new AuthException(AuthErrorCode.OAUTH_EMAIL_UNVERIFIED);
        }

        // nickname/name은 회원 필수 컬럼이라 미동의 시 DB 제약 위반 대신 명확한 사유로 거부한다.
        if (!StringUtils.hasText(oAuthMember.nickname()) && !StringUtils.hasText(oAuthMember.name())) {
            throw new AuthException(AuthErrorCode.OAUTH_PROFILE_REQUIRED);
        }
    }

    private OAuthConsentSnapshot validateState(OAuthProvider provider, String state) {
        if (!StringUtils.hasText(state)) {
            throw new AuthException(AuthErrorCode.INVALID_OAUTH_STATE);
        }

        OAuthStateQueryResult saved = oAuthStateStorePort.consume(state)
            .orElseThrow(() -> new AuthException(AuthErrorCode.INVALID_OAUTH_STATE));

        if (saved.provider() != provider) {
            throw new AuthException(AuthErrorCode.INVALID_OAUTH_STATE);
        }
        return saved.consent();
    }

    private Member resolveExistingMember(Member existing, OAuthProvider provider, OAuthMemberQueryResult oAuthMember) {
        // 상태 먼저 확인 — 탈퇴/정지 회원은 소셜 로그인도 차단
        switch (existing.status()) {
            case WITHDRAWN -> throw new MemberException(MemberErrorCode.MEMBER_ALREADY_WITHDRAWN);
            case SUSPENDED -> throw new MemberException(MemberErrorCode.MEMBER_SUSPENDED);
            case ACTIVE -> {
            } // 정상
        }

        // 일반 계정이면 소셜 계정으로 연결한다.
        // 검증된 이메일만 여기 도달하므로(validateRequiredProfile) 계정 탈취 경로가 아니다.
        if (existing.provider() == null) {
            log.info("[OAuthLoginProcessor] 일반 계정을 소셜 계정으로 연결: memberId={}, provider={}", existing.id(), provider);
            Member linked = memberRepositoryPort.save(existing.withProvider(provider));
            // 연결 사실을 메일로 통보한다 — 본인이 한 게 아니면 즉시 알아챌 수 있는 탈취 감지 수단.
            // 비동기 발송이라 로그인 흐름을 막지 않고, 실패해도 로그인은 성공한다.
            mailSendPort.sendSocialLinkedNotice(linked.email(), provider.getDescription());
            return linked;
        }

        // 다른 provider로 가입된 계정이면 차단
        if (existing.provider() != provider) {
            throw new AuthException(AuthErrorCode.UNMATCHED_OAUTH_PROVIDER, existing.provider().getDescription());
        }
        return existing;
    }

    /**
     * 소셜 첫 가입 = 신규 가입이다. 그래서 일반 가입과 같은 기준으로 동의·확인을 요구하고, 같은 모양의 이력을 남긴다.
     * 동의 검증은 회원을 만들기 <b>전</b>이어야 한다 — 만들고 나서 막으면 동의 없는 계정이 남는다.
     */
    private Member signupOAuthMember(OAuthProvider provider, String email, OAuthMemberQueryResult oAuthMember, OAuthConsentSnapshot consent) {
        validateSignupConsent(consent);

        Member created = createOAuthMember(provider, email, oAuthMember);
        // 이력 생성 규칙(항목·AGE_OVER_14 의 판·같은 시각)은 member 컨텍스트의 단일 지점(MemberConsentProcessor)에 있다.
        // 여기서 넘기는 것은 /authorize 에서 동의한 순간의 판·시각뿐이다.
        signupConsentRecordPort.recordSignupConsents(created.id(), consent.termsVersion(), consent.privacyVersion(), consent.agreedAt());
        return created;
    }

    /**
     * 거부 사유를 항목별로 갈라 던진다. 뭉뚱그리면 프론트가 어느 체크박스를 강조할지 알 수 없다. 콜백은 인가코드를 이미 쓴
     * 뒤라 되돌아갈 곳이 동의 화면과 {@code /authorize} 뿐이고, 그래서 일반 가입(MEMBER_010/011)과 다른 전용 코드를 쓴다.
     * 문서 동의를 먼저 본다 — 동의를 아예 싣지 않은 첫 시도(가장 흔한 경우)와, 판을 싣기 전 형식의 state 는 AUTH_021 로 나간다.
     */
    private void validateSignupConsent(OAuthConsentSnapshot consent) {
        if (!consent.documentsAgreed()) {
            throw new AuthException(AuthErrorCode.OAUTH_SIGNUP_CONSENT_REQUIRED);
        }
        if (!consent.ageOver14Confirmed()) {
            throw new AuthException(AuthErrorCode.OAUTH_SIGNUP_AGE_REQUIREMENT_NOT_MET);
        }
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
