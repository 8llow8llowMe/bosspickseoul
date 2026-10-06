package com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.member.SignupConsentRecordAdapter;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.OAuthCallbackInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthConsentSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthSignupConsent;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.MailSendPort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.OAuthAuthorizationUrlProvider;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.OAuthMemberQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.OAuthStateStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthStateQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.oauth.OAuthAuthorizationUrlRouter;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.service.oauth.OAuthMemberQueryRouter;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberConsentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor.MemberConsentProcessor;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberConsentType;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import com.followfollowme.bosspickseoul.global.properties.LegalProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 소셜 로그인의 동의 처리 검증.
 *
 * <p>이 경로는 동의를 받는 시점과 쓰는 시점이 다르다 — 인가 URL 을 만들 때 받아 그 순간의 판·시각과 함께 state 에 얹어 두고,
 * 콜백에서 신규 회원을 만들 때 꺼내 쓴다. 그래서 확인할 것은 다섯이다: 동의가 state 에 실려 콜백까지 오는가, 이력이 "동의한
 * 순간" 의 판·시각으로 남는가, 신규면 동의가 필수인가, 동의가 일반 가입과 같은 이력으로 남는가, 그리고 <b>기존 회원은
 * 건드리지 않는가</b>.
 */
class OAuthLoginProcessorTest {

    private static final OAuthProvider PROVIDER = OAuthProvider.KAKAO;
    private static final String EMAIL = "tester@example.com";
    private static final OAuthSignupConsent AGREED_ALL = new OAuthSignupConsent(true, true, true);
    private static final LegalProperties CURRENT_VERSIONS = new LegalProperties("1.0", "1.1", null);

    private StubOAuthStateStorePort stateStorePort;
    private StubMemberRepositoryPort memberRepositoryPort;
    private RecordingConsentRepositoryPort consentRepositoryPort;
    private RecordingMailSendPort mailSendPort;
    private OAuthLoginProcessor processor;

    @BeforeEach
    void setUp() {
        stateStorePort = new StubOAuthStateStorePort();
        memberRepositoryPort = new StubMemberRepositoryPort();
        consentRepositoryPort = new RecordingConsentRepositoryPort();
        mailSendPort = new RecordingMailSendPort();
        processor = processorWith(CURRENT_VERSIONS);
    }

    @Test
    @DisplayName("인가 URL 을 만들 때 받은 동의를 그 순간의 판·시각과 함께 state 에 저장한다")
    void authorize_savesConsentWithVersionsAndTimeTogetherWithState() {
        LocalDateTime before = LocalDateTime.now();
        String url = processor.generateAuthorizationUrl(PROVIDER, AGREED_ALL);

        assertThat(url).contains("state=" + stateStorePort.lastState);
        OAuthStateQueryResult saved = stateStorePort.states.get(stateStorePort.lastState);
        assertThat(saved.provider()).isEqualTo(PROVIDER);
        assertThat(saved.consent().consent()).isEqualTo(AGREED_ALL);
        assertThat(saved.consent().termsVersion()).isEqualTo("1.0");
        assertThat(saved.consent().privacyVersion()).isEqualTo("1.1");
        assertThat(saved.consent().agreedAt()).isBetween(before, LocalDateTime.now());
    }

    @Test
    @DisplayName("동의 없이 인가 URL 을 만드는 것도 허용한다 — 기존 회원 로그인은 동의가 필요 없다")
    void authorize_withoutConsent_isAllowed() {
        processor.generateAuthorizationUrl(PROVIDER, OAuthSignupConsent.none());

        assertThat(stateStorePort.states.get(stateStorePort.lastState).consent().consent()).isEqualTo(OAuthSignupConsent.none());
    }

    @Test
    @DisplayName("신규 회원 + 동의 있음: 인가 때 받은 동의가 콜백까지 와서 회원과 이력 3건이 함께 생긴다")
    void newMemberWithConsent_createsMemberAndRecordsConsents() {
        GeneralLoginInfo loginInfo = authorizeAndLogin(AGREED_ALL);

        Member created = memberRepositoryPort.findByEmail(EMAIL).orElseThrow();
        assertThat(loginInfo.memberId()).isEqualTo(created.id());
        assertThat(created.provider()).isEqualTo(PROVIDER);
        assertThat(consentRepositoryPort.saved)
            .extracting(MemberConsent::memberId, MemberConsent::consentType, MemberConsent::documentVersion)
            .containsExactly(
                tuple(created.id(), MemberConsentType.TERMS, "1.0"),
                tuple(created.id(), MemberConsentType.PRIVACY, "1.1"),
                tuple(created.id(), MemberConsentType.AGE_OVER_14, "1.0"));
    }

    @Test
    @DisplayName("인가와 콜백 사이에 판 설정이 바뀌어도 이력은 인가(동의한 순간)의 판·시각으로 남는다")
    void versionChangeBetweenAuthorizeAndCallback_recordsWhatTheUserAgreedTo() {
        processor.generateAuthorizationUrl(PROVIDER, AGREED_ALL);
        String state = stateStorePort.lastState;
        LocalDateTime agreedAt = stateStorePort.states.get(state).consent().agreedAt();

        // state TTL(10분) 안에 개정판이 배포된 상황 — 콜백은 새 설정을 가진 인스턴스가 받는다.
        OAuthLoginProcessor afterRevision = processorWith(new LegalProperties("2.0", "2.0", null));
        OAuthCallbackInfo callbackInfo = afterRevision.fetchOAuthMember(PROVIDER, "code", state);
        afterRevision.login(PROVIDER, callbackInfo);

        assertThat(consentRepositoryPort.saved)
            .extracting(MemberConsent::consentType, MemberConsent::documentVersion, MemberConsent::agreedAt)
            .containsExactly(
                tuple(MemberConsentType.TERMS, "1.0", agreedAt),
                tuple(MemberConsentType.PRIVACY, "1.1", agreedAt),
                tuple(MemberConsentType.AGE_OVER_14, "1.0", agreedAt));
    }

    @Test
    @DisplayName("신규 회원 + 동의 없음: AUTH_021 로 거부하고 회원도 이력도 만들지 않는다")
    void newMemberWithoutConsent_isRejectedWithDedicatedCode() {
        assertRejected(OAuthSignupConsent.none(), AuthErrorCode.OAUTH_SIGNUP_CONSENT_REQUIRED);
    }

    @Test
    @DisplayName("신규 회원 + 이용약관 또는 처리방침 하나만 동의: AUTH_021")
    void newMemberWithPartialDocumentConsent_isRejected() {
        assertRejected(new OAuthSignupConsent(false, true, true), AuthErrorCode.OAUTH_SIGNUP_CONSENT_REQUIRED);
        assertRejected(new OAuthSignupConsent(true, false, true), AuthErrorCode.OAUTH_SIGNUP_CONSENT_REQUIRED);
    }

    @Test
    @DisplayName("신규 회원 + 문서 동의는 했지만 만 14세 확인 없음: 동의 누락과 다른 AUTH_022")
    void newMemberWithoutAgeConfirmation_isRejectedWithAgeCode() {
        assertRejected(new OAuthSignupConsent(true, true, false), AuthErrorCode.OAUTH_SIGNUP_AGE_REQUIREMENT_NOT_MET);
    }

    @Test
    @DisplayName("신규 회원 + 판을 모르는 동의(판을 싣기 전 형식의 state): 동의 없음으로 보고 AUTH_021")
    void newMemberWithConsentButNoVersions_isRejected() {
        String state = "legacy-state";
        stateStorePort.states.put(state, new OAuthStateQueryResult(PROVIDER, new OAuthConsentSnapshot(AGREED_ALL, null, null, null)));

        OAuthCallbackInfo callbackInfo = processor.fetchOAuthMember(PROVIDER, "code", state);

        assertThatThrownBy(() -> processor.login(PROVIDER, callbackInfo))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.OAUTH_SIGNUP_CONSENT_REQUIRED);
        assertThat(memberRepositoryPort.findByEmail(EMAIL)).isEmpty();
    }

    @Test
    @DisplayName("기존 회원 + 동의 없음: 정상 로그인되고 이력을 덧붙이지 않는다 — 소급 동의를 받지 않는다")
    void existingMemberWithoutConsent_logsIn() {
        Member existing = memberRepositoryPort.save(member(PROVIDER));

        GeneralLoginInfo loginInfo = authorizeAndLogin(OAuthSignupConsent.none());

        assertThat(loginInfo.memberId()).isEqualTo(existing.id());
        assertThat(consentRepositoryPort.saved).isEmpty();
    }

    @Test
    @DisplayName("기존 일반 회원 + 동의 없음: 소셜 연결도 동의와 무관하게 통과한다")
    void existingGeneralMemberWithoutConsent_isLinked() {
        Member existing = memberRepositoryPort.save(member(null));

        GeneralLoginInfo loginInfo = authorizeAndLogin(OAuthSignupConsent.none());

        assertThat(loginInfo.memberId()).isEqualTo(existing.id());
        assertThat(memberRepositoryPort.findByEmail(EMAIL).orElseThrow().provider()).isEqualTo(PROVIDER);
        assertThat(mailSendPort.linkedNotices).containsExactly(EMAIL);
        assertThat(consentRepositoryPort.saved).isEmpty();
    }

    @Test
    @DisplayName("state 는 일회성이다 — 같은 state 로 두 번째 콜백은 AUTH_010")
    void state_isConsumedOnce() {
        processor.generateAuthorizationUrl(PROVIDER, AGREED_ALL);
        String state = stateStorePort.lastState;
        processor.fetchOAuthMember(PROVIDER, "code", state);

        assertThatThrownBy(() -> processor.fetchOAuthMember(PROVIDER, "code", state))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.INVALID_OAUTH_STATE);
    }

    @Test
    @DisplayName("다른 provider 로 발급한 state 는 받지 않는다")
    void state_ofAnotherProvider_isRejected() {
        processor.generateAuthorizationUrl(PROVIDER, AGREED_ALL);

        assertThatThrownBy(() -> processor.fetchOAuthMember(OAuthProvider.NAVER, "code", stateStorePort.lastState))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.INVALID_OAUTH_STATE);
    }

    // --- fixtures ---

    /**
     * 같은 state 저장소·회원·이력 저장소를 공유하는 프로세서. 판 설정만 바꿔 "인가와 콜백 사이의 배포" 를 흉내 낼 수 있다.
     * 동의 이력은 실물 체인(어댑터 → MemberConsentProcessor)을 탄다 — 소셜 경로가 일반 가입과 같은 규칙을 쓰는지가 요점이다.
     */
    private OAuthLoginProcessor processorWith(LegalProperties legalProperties) {
        SnowflakeIdGenerator idGenerator = new SnowflakeIdGenerator(1, 1);
        MemberConsentProcessor consentProcessor = new MemberConsentProcessor(consentRepositoryPort, idGenerator, legalProperties);
        return new OAuthLoginProcessor(
            new OAuthAuthorizationUrlRouter(Set.of(new StubAuthorizationUrlProvider())),
            new OAuthMemberQueryRouter(Set.of(new StubMemberQueryPort())),
            stateStorePort,
            memberRepositoryPort,
            new SignupConsentRecordAdapter(consentProcessor),
            mailSendPort,
            idGenerator,
            legalProperties);
    }

    /** 실제 흐름 그대로: 인가 URL 발급(동의 저장) → 콜백(state 소비, 동의 꺼냄) → 회원 조회/생성. */
    private GeneralLoginInfo authorizeAndLogin(OAuthSignupConsent consent) {
        processor.generateAuthorizationUrl(PROVIDER, consent);
        OAuthCallbackInfo callbackInfo = processor.fetchOAuthMember(PROVIDER, "code", stateStorePort.lastState);
        return processor.login(PROVIDER, callbackInfo);
    }

    private void assertRejected(OAuthSignupConsent consent, AuthErrorCode expected) {
        assertThatThrownBy(() -> authorizeAndLogin(consent))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(expected);
        // 거부는 회원 생성 "전"이어야 한다. 만들고 나서 막으면 동의 없는 계정이 남는다.
        assertThat(memberRepositoryPort.findByEmail(EMAIL)).isEmpty();
        assertThat(consentRepositoryPort.saved).isEmpty();
    }

    private static Member member(OAuthProvider provider) {
        return Member.builder()
            .id(1L).email(EMAIL).password(provider == null ? "encoded" : null).name("테스터").nickname("테스터")
            .role(SecurityRole.USER).provider(provider).status(MemberStatus.ACTIVE)
            .build();
    }

    /** 인가 URL 자체는 이 테스트의 관심사가 아니다 — state 가 무엇을 싣고 가는지만 본다. */
    private static class StubAuthorizationUrlProvider implements OAuthAuthorizationUrlProvider {

        @Override
        public OAuthProvider supports() {
            return PROVIDER;
        }

        @Override
        public String generateUrl(String state) {
            return "https://example.test/authorize?state=" + state;
        }
    }

    /** provider 왕복을 대신한다. 프로필은 고정이고, 테스트마다 다른 것은 state 에 실린 동의뿐이다. */
    private static class StubMemberQueryPort implements OAuthMemberQueryPort {

        @Override
        public OAuthProvider supports() {
            return PROVIDER;
        }

        @Override
        public OAuthMemberQueryResult fetchMember(String authCode, String state) {
            return OAuthMemberQueryResult.builder()
                .email(EMAIL).emailVerified(true).name("테스터").nickname("테스터").build();
        }
    }

    /** state 저장을 메모리로 흉내 낸다. consume 은 실제 구현(GETDEL)과 같이 일회성이다. */
    private static class StubOAuthStateStorePort implements OAuthStateStorePort {

        private final Map<String, OAuthStateQueryResult> states = new HashMap<>();
        private String lastState;

        @Override
        public void save(String state, OAuthProvider provider, OAuthConsentSnapshot consent, Duration ttl) {
            states.put(state, new OAuthStateQueryResult(provider, consent));
            lastState = state;
        }

        @Override
        public Optional<OAuthStateQueryResult> consume(String state) {
            return Optional.ofNullable(states.remove(state));
        }
    }

    private static class RecordingConsentRepositoryPort implements MemberConsentRepositoryPort {

        private final List<MemberConsent> saved = new ArrayList<>();

        @Override
        public List<MemberConsent> saveAll(List<MemberConsent> consents) {
            saved.addAll(consents);
            return consents;
        }
    }

    private static class StubMemberRepositoryPort implements MemberRepositoryPort {

        private final Map<Long, Member> members = new HashMap<>();

        @Override
        public Member save(Member domain) {
            members.put(domain.id(), domain);
            return domain;
        }

        @Override
        public boolean existsByEmail(String email) {
            return findByEmail(email).isPresent();
        }

        @Override
        public Optional<Member> findByEmail(String email) {
            return members.values().stream().filter(member -> member.email().equals(email)).findFirst();
        }

        @Override
        public Optional<Member> findById(long memberId) {
            return Optional.ofNullable(members.get(memberId));
        }

        @Override
        public List<Member> findAllByIds(Collection<Long> memberIds) {
            throw new UnsupportedOperationException("not used in this test");
        }
    }

    /** 계정 연결 통보만 기록한다. 나머지 메일은 이 테스트가 보지 않는다. */
    private static class RecordingMailSendPort implements MailSendPort {

        private final List<String> linkedNotices = new ArrayList<>();

        @Override
        public void sendVerificationCode(String email, String code) {
        }

        @Override
        public void sendAlreadyRegisteredNotice(String email) {
        }

        @Override
        public void sendPasswordResetCode(String email, String code) {
        }

        @Override
        public void sendPasswordResetNotRegisteredNotice(String email) {
        }

        @Override
        public void sendPasswordResetSocialOnlyNotice(String email, String providerName) {
        }

        @Override
        public void sendSocialLinkedNotice(String email, String providerName) {
            linkedNotices.add(email);
        }

        @Override
        public void sendPasswordRemovedNotice(String email, String providerName) {
        }
    }
}
