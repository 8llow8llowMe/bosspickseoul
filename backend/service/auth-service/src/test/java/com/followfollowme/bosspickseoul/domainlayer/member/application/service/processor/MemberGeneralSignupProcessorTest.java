package com.followfollowme.bosspickseoul.domainlayer.member.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.member.application.exception.MemberException;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.SignupEmailVerificationPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class MemberGeneralSignupProcessorTest {

    private PasswordEncoder passwordEncoder;
    private StubMemberRepositoryPort memberRepositoryPort;
    private StubSignupEmailVerificationPort emailVerificationPort;
    private MemberGeneralSignupProcessor processor;

    @BeforeEach
    void setUp() {
        // bcrypt strength 4 — 실제 인코딩 로직을 그대로 쓰면서 테스트 시간만 줄인다.
        passwordEncoder = new BCryptPasswordEncoder(4);
        memberRepositoryPort = new StubMemberRepositoryPort();
        emailVerificationPort = new StubSignupEmailVerificationPort();
        processor = new MemberGeneralSignupProcessor(
            memberRepositoryPort, emailVerificationPort, passwordEncoder, new SnowflakeIdGenerator(0, 0));
    }

    @Test
    void generalSignup_withoutEmailVerification_rejects() {
        // 일반 가입은 이메일 인증 게이트가 그대로 유지된다 (devSignup 추가로 흔들리면 안 되는 계약)
        assertThatThrownBy(() -> processor.generalSignup(command("user@example.com")))
            .isInstanceOf(MemberException.class)
            .extracting(exception -> ((MemberException) exception).getErrorCode())
            .isEqualTo(MemberErrorCode.EMAIL_NOT_VERIFIED);
        assertThat(memberRepositoryPort.members).isEmpty();
    }

    @Test
    void devSignup_skipsEmailVerificationGate() {
        // 인증 플래그가 없어도 즉시 가입된다
        Member created = processor.devSignup(command("Tester@Example.com "));

        // 정규화(trim+소문자)와 비밀번호 인코딩은 일반 가입과 동일하게 적용된다
        assertThat(created.email()).isEqualTo("tester@example.com");
        assertThat(passwordEncoder.matches("Password1!", created.password())).isTrue();
        assertThat(memberRepositoryPort.members).hasSize(1);
    }

    @Test
    void devSignup_duplicateEmail_rejects() {
        processor.devSignup(command("user@example.com"));

        assertThatThrownBy(() -> processor.devSignup(command("user@example.com")))
            .isInstanceOf(MemberException.class)
            .extracting(exception -> ((MemberException) exception).getErrorCode())
            .isEqualTo(MemberErrorCode.EXIST_MEMBER_EMAIL);
        assertThat(memberRepositoryPort.members).hasSize(1);
    }

    private MemberGeneralSignupCommand command(String email) {
        return MemberGeneralSignupCommand.builder()
            .email(email)
            .password("Password1!")
            .name("테스터")
            .nickname("tester")
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
    }

    private static class StubSignupEmailVerificationPort implements SignupEmailVerificationPort {

        @Override
        public boolean isVerified(String email) {
            return false;
        }

        @Override
        public void consume(String email) {
        }
    }
}
