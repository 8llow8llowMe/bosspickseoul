package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberConsentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.SignupEmailVerificationPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberConsentType;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.MemberConsent;
import com.followfollowme.bosspickseoul.global.properties.LegalProperties;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class MemberGeneralSignupProcessorTest {

    private static final String TERMS_VERSION = "1.0";
    private static final String PRIVACY_VERSION = "1.1";

    private PasswordEncoder passwordEncoder;
    private StubMemberRepositoryPort memberRepositoryPort;
    private StubSignupEmailVerificationPort emailVerificationPort;
    private RecordingConsentRepositoryPort consentRepositoryPort;
    private MemberGeneralSignupProcessor processor;

    @BeforeEach
    void setUp() {
        // bcrypt strength 4 — 실제 인코딩 로직을 그대로 쓰면서 테스트 시간만 줄인다.
        passwordEncoder = new BCryptPasswordEncoder(4);
        memberRepositoryPort = new StubMemberRepositoryPort();
        emailVerificationPort = new StubSignupEmailVerificationPort();
        consentRepositoryPort = new RecordingConsentRepositoryPort();
        SnowflakeIdGenerator idGenerator = new SnowflakeIdGenerator(0, 0);
        // 동의 프로세서는 실물을 쓴다 — 가입 경로가 이력 규칙의 단일 지점을 실제로 타는지가 요점이다.
        MemberConsentProcessor consentProcessor = new MemberConsentProcessor(
            consentRepositoryPort, idGenerator, new LegalProperties(TERMS_VERSION, PRIVACY_VERSION, null));
        processor = new MemberGeneralSignupProcessor(
            memberRepositoryPort, consentProcessor, emailVerificationPort, passwordEncoder, idGenerator);
    }

    @Test
    @DisplayName("일반 가입에 성공하면 동의 이력 3건이 같은 시각, 설정된 판으로 남고 인증 플래그를 소비한다")
    void generalSignup_success_recordsConsentsAndConsumesVerification() {
        emailVerificationPort.verify("user@example.com");

        processor.generalSignup(command("User@Example.com ", true, true, true));

        Member member = memberRepositoryPort.findByEmail("user@example.com").orElseThrow();
        assertThat(consentRepositoryPort.saved)
            .extracting(MemberConsent::memberId, MemberConsent::consentType, MemberConsent::documentVersion)
            .containsExactly(
                tuple(member.id(), MemberConsentType.TERMS, TERMS_VERSION),
                tuple(member.id(), MemberConsentType.PRIVACY, PRIVACY_VERSION),
                tuple(member.id(), MemberConsentType.AGE_OVER_14, TERMS_VERSION));
        assertThat(consentRepositoryPort.saved)
            .extracting(MemberConsent::agreedAt)
            .containsOnly(consentRepositoryPort.saved.getFirst().agreedAt());
        assertThat(emailVerificationPort.consumed).containsExactly("user@example.com");
    }

    @Test
    @DisplayName("이용약관 동의가 없으면 MEMBER_010 으로 거부하고 회원도 이력도 남기지 않는다")
    void generalSignup_withoutTerms_rejectsWithConsentRequired() {
        emailVerificationPort.verify("user@example.com");

        assertRejected(() -> processor.generalSignup(command("user@example.com", false, true, true)), MemberErrorCode.CONSENT_REQUIRED);
        // 인증 플래그도 그대로 둔다 — 동의를 받아 다시 제출하면 이메일 인증을 다시 하지 않아도 된다.
        assertThat(emailVerificationPort.consumed).isEmpty();
    }

    @Test
    @DisplayName("개인정보 처리방침 동의가 없으면 MEMBER_010 으로 거부한다")
    void generalSignup_withoutPrivacy_rejectsWithConsentRequired() {
        emailVerificationPort.verify("user@example.com");

        assertRejected(() -> processor.generalSignup(command("user@example.com", true, false, true)), MemberErrorCode.CONSENT_REQUIRED);
    }

    @Test
    @DisplayName("만 14세 이상 확인이 없으면 동의 누락과 다른 MEMBER_011 로 거부한다")
    void generalSignup_withoutAgeConfirmation_rejectsWithAgeCode() {
        emailVerificationPort.verify("user@example.com");

        assertRejected(() -> processor.generalSignup(command("user@example.com", true, true, false)), MemberErrorCode.AGE_REQUIREMENT_NOT_MET);
    }

    @Test
    @DisplayName("문서 동의와 만 14세 확인이 함께 비면 문서 동의 누락을 먼저 알린다")
    void generalSignup_everythingMissing_reportsConsentFirst() {
        emailVerificationPort.verify("user@example.com");

        assertRejected(() -> processor.generalSignup(command("user@example.com", false, false, false)), MemberErrorCode.CONSENT_REQUIRED);
    }

    @Test
    void generalSignup_withoutEmailVerification_rejects() {
        // 일반 가입은 이메일 인증 게이트가 그대로 유지된다 (devSignup 추가로 흔들리면 안 되는 계약)
        assertRejected(() -> processor.generalSignup(command("user@example.com", true, true, true)), MemberErrorCode.EMAIL_NOT_VERIFIED);
    }

    @Test
    void devSignup_skipsEmailVerificationGate() {
        // 인증 플래그가 없어도 즉시 가입된다
        Member created = processor.devSignup(command("Tester@Example.com ", true, true, true));

        // 정규화(trim+소문자)와 비밀번호 인코딩은 일반 가입과 동일하게 적용된다
        assertThat(created.email()).isEqualTo("tester@example.com");
        assertThat(passwordEncoder.matches("Password1!", created.password())).isTrue();
        assertThat(memberRepositoryPort.members).hasSize(1);
    }

    @Test
    @DisplayName("개발용 가입도 일반 가입과 같은 동의 이력 3건을 남긴다")
    void devSignup_recordsTheSameConsentHistory() {
        Member created = processor.devSignup(command("tester@example.com", true, true, true));

        assertThat(consentRepositoryPort.saved)
            .extracting(MemberConsent::memberId, MemberConsent::consentType, MemberConsent::documentVersion)
            .containsExactly(
                tuple(created.id(), MemberConsentType.TERMS, TERMS_VERSION),
                tuple(created.id(), MemberConsentType.PRIVACY, PRIVACY_VERSION),
                tuple(created.id(), MemberConsentType.AGE_OVER_14, TERMS_VERSION));
    }

    @Test
    @DisplayName("개발용 가입도 동의를 기본값으로 채우지 않는다 — 동의·확인이 없으면 거부한다")
    void devSignup_withoutConsent_rejects() {
        assertRejected(() -> processor.devSignup(command("tester@example.com", false, true, true)), MemberErrorCode.CONSENT_REQUIRED);
        assertRejected(() -> processor.devSignup(command("tester@example.com", true, true, false)), MemberErrorCode.AGE_REQUIREMENT_NOT_MET);
    }

    @Test
    void devSignup_duplicateEmail_rejects() {
        processor.devSignup(command("user@example.com", true, true, true));

        assertThatThrownBy(() -> processor.devSignup(command("user@example.com", true, true, true)))
            .isInstanceOf(MemberException.class)
            .extracting(exception -> ((MemberException) exception).getErrorCode())
            .isEqualTo(MemberErrorCode.EXIST_MEMBER_EMAIL);
        assertThat(memberRepositoryPort.members).hasSize(1);
        // 중복으로 막힌 요청은 이력을 남기지 않는다 — 첫 가입의 3건만 있어야 한다.
        assertThat(consentRepositoryPort.saved).hasSize(3);
    }

    private void assertRejected(Runnable signup, MemberErrorCode expected) {
        assertThatThrownBy(signup::run)
            .isInstanceOf(MemberException.class)
            .extracting(exception -> ((MemberException) exception).getErrorCode())
            .isEqualTo(expected);
        // 거부는 회원 생성 "전"이어야 한다. 만들고 나서 막으면 동의 없는 계정이 남는다.
        assertThat(memberRepositoryPort.members).isEmpty();
        assertThat(consentRepositoryPort.saved).isEmpty();
    }

    private MemberGeneralSignupCommand command(String email, boolean termsAgreed, boolean privacyAgreed, boolean ageOver14Confirmed) {
        return MemberGeneralSignupCommand.builder()
            .email(email)
            .password("Password1!")
            .name("테스터")
            .nickname("tester")
            .termsAgreed(termsAgreed)
            .privacyAgreed(privacyAgreed)
            .ageOver14Confirmed(ageOver14Confirmed)
            .build();
    }

    private static class StubMemberRepositoryPort implements MemberRepositoryPort {

        private final Map<String, Member> members = new HashMap<>();

        @Override
        public Member save(Member domain) {
            members.put(domain.email(), domain);
            return domain;
        }

        @Override
        public boolean existsByEmail(String email) {
            return members.containsKey(email);
        }

        @Override
        public Optional<Member> findByEmail(String email) {
            return Optional.ofNullable(members.get(email));
        }

        @Override
        public Optional<Member> findById(long memberId) {
            return members.values().stream().filter(member -> member.id() == memberId).findFirst();
        }

        @Override
        public List<Member> findAllByIds(Collection<Long> memberIds) {
            throw new UnsupportedOperationException("not used in this test");
        }
    }

    private static class StubSignupEmailVerificationPort implements SignupEmailVerificationPort {

        private final Set<String> verified = new HashSet<>();
        private final List<String> consumed = new ArrayList<>();

        void verify(String email) {
            verified.add(email);
        }

        @Override
        public boolean isVerified(String email) {
            return verified.contains(email);
        }

        @Override
        public void consume(String email) {
            consumed.add(email);
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
}
