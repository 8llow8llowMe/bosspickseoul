package com.followfollowme.nowdoboss.domainlayer.auth.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.LoginAttemptStorePort;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.nowdoboss.domainlayer.member.domain.model.Member;
import com.followfollowme.nowdoboss.global.properties.LoginAttemptProperties;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class GeneralLoginProcessorTest {

    private static final String EMAIL = "member@example.com";
    private static final String RAW_PASSWORD = "Password1!";
    private static final int MAX_FAILURE_COUNT = 3;

    private PasswordEncoder passwordEncoder;
    private StubMemberRepositoryPort memberRepositoryPort;
    private StubLoginAttemptStorePort loginAttemptStorePort;
    private GeneralLoginProcessor processor;

    @BeforeEach
    void setUp() {
        // bcrypt strength 4 — 실제 검증 로직을 그대로 쓰면서 테스트 시간만 줄인다.
        passwordEncoder = new BCryptPasswordEncoder(4);
        memberRepositoryPort = new StubMemberRepositoryPort();
        loginAttemptStorePort = new StubLoginAttemptStorePort();
        processor = new GeneralLoginProcessor(
            memberRepositoryPort,
            passwordEncoder,
            loginAttemptStorePort,
            new LoginAttemptProperties(MAX_FAILURE_COUNT, Duration.ofMinutes(10))
        );
        memberRepositoryPort.register(activeMember());
    }

    @Test
    void generalLogin_belowThreshold_failsWithLoginFailedAndCountsUp() {
        assertLoginFailed("wrong-password");
        assertLoginFailed("wrong-password");

        assertThat(loginAttemptStorePort.failureCounts.get(EMAIL)).isEqualTo(2L);
        assertThat(loginAttemptStorePort.locks).isEmpty();
    }

    @Test
    void generalLogin_correctPasswordBelowThreshold_succeeds() {
        assertLoginFailed("wrong-password");

        GeneralLoginInfo info = processor.generalLogin(command(EMAIL, RAW_PASSWORD));

        assertThat(info.memberId()).isEqualTo(1L);
        assertThat(info.role()).isEqualTo(SecurityRole.USER);
    }

    @Test
    void generalLogin_thresholdReached_locksAndRespondsWithLockedCode() {
        for (int attempt = 0; attempt < MAX_FAILURE_COUNT - 1; attempt++) {
            assertLoginFailed("wrong-password");
        }

        // 임계값에 도달한 실패부터 AUTH_015 로 전환된다.
        assertLoginLocked("wrong-password");
        assertThat(loginAttemptStorePort.locks).containsKey(EMAIL);

        // 잠금 이후에는 올바른 비밀번호여도 잠금 응답이 유지된다 (회원 조회 자체를 하지 않는다).
        memberRepositoryPort.findByEmailCallCount = 0;
        assertLoginLocked(RAW_PASSWORD);
        assertThat(memberRepositoryPort.findByEmailCallCount).isZero();
    }

    @Test
    void generalLogin_success_clearsFailureCounter() {
        assertLoginFailed("wrong-password");
        assertThat(loginAttemptStorePort.failureCounts).containsKey(EMAIL);

        processor.generalLogin(command(EMAIL, RAW_PASSWORD));

        assertThat(loginAttemptStorePort.failureCounts).isEmpty();
        assertThat(loginAttemptStorePort.locks).isEmpty();
    }

    @Test
    void generalLogin_unknownEmail_behavesIdenticallyToWrongPassword() {
        String unknownEmail = "no-such-member@example.com";

        // 계정 열거 방지: 미존재 이메일도 같은 코드로 카운팅되고 같은 임계값에서 같은 코드로 잠긴다.
        for (int attempt = 0; attempt < MAX_FAILURE_COUNT - 1; attempt++) {
            assertThatThrownBy(() -> processor.generalLogin(command(unknownEmail, RAW_PASSWORD)))
                .isInstanceOf(AuthException.class)
                .extracting(t -> ((AuthException) t).getErrorCode())
                .isEqualTo(AuthErrorCode.LOGIN_FAILED);
        }
        assertThat(loginAttemptStorePort.failureCounts.get(unknownEmail)).isEqualTo((long) MAX_FAILURE_COUNT - 1);

        assertThatThrownBy(() -> processor.generalLogin(command(unknownEmail, RAW_PASSWORD)))
            .isInstanceOf(AuthException.class)
            .extracting(t -> ((AuthException) t).getErrorCode())
            .isEqualTo(AuthErrorCode.LOGIN_ATTEMPT_LOCKED);
        assertThat(loginAttemptStorePort.locks).containsKey(unknownEmail);
    }

    @Test
    void generalLogin_emailCaseAndPadding_sharesTheSameCounterKey() {
        assertLoginFailed("wrong-password");
        assertThatThrownBy(() -> processor.generalLogin(command("  MEMBER@Example.COM  ", "wrong-password")))
            .isInstanceOf(AuthException.class);

        // 대소문자/공백을 바꿔 카운터를 우회하지 못한다.
        assertThat(loginAttemptStorePort.failureCounts).hasSize(1);
        assertThat(loginAttemptStorePort.failureCounts.get(EMAIL)).isEqualTo(2L);
    }

    @Test
    void generalLogin_counterStoreUnavailable_failsOpenAndKeepsLoginWorking() {
        loginAttemptStorePort.unavailable = true;

        // 카운터 저장소 장애 시 잠금 없이 기존 동작(AUTH_006)만 유지되고, 정상 로그인은 그대로 성공한다.
        for (int attempt = 0; attempt < MAX_FAILURE_COUNT + 2; attempt++) {
            assertLoginFailed("wrong-password");
        }
        assertThat(loginAttemptStorePort.locks).isEmpty();

        GeneralLoginInfo info = processor.generalLogin(command(EMAIL, RAW_PASSWORD));
        assertThat(info.memberId()).isEqualTo(1L);
    }

    private void assertLoginFailed(String password) {
        assertThatThrownBy(() -> processor.generalLogin(command(EMAIL, password)))
            .isInstanceOf(AuthException.class)
            .extracting(t -> ((AuthException) t).getErrorCode())
            .isEqualTo(AuthErrorCode.LOGIN_FAILED);
    }

    private void assertLoginLocked(String password) {
        assertThatThrownBy(() -> processor.generalLogin(command(EMAIL, password)))
            .isInstanceOf(AuthException.class)
            .extracting(t -> ((AuthException) t).getErrorCode())
            .isEqualTo(AuthErrorCode.LOGIN_ATTEMPT_LOCKED);
    }

    private AuthGeneralLoginCommand command(String email, String password) {
        return AuthGeneralLoginCommand.builder().email(email).password(password).build();
    }

    private Member activeMember() {
        return Member.builder()
            .id(1L)
            .email(EMAIL)
            .password(passwordEncoder.encode(RAW_PASSWORD))
            .name("회원")
            .nickname("회원")
            .role(SecurityRole.USER)
            .status(MemberStatus.ACTIVE)
            .build();
    }

    private static final class StubMemberRepositoryPort implements MemberRepositoryPort {

        private final Map<String, Member> members = new HashMap<>();
        private int findByEmailCallCount;

        private void register(Member member) {
            members.put(member.email(), member);
        }

        @Override
        public Member save(Member domain) {
            register(domain);
            return domain;
        }

        @Override
        public boolean existsByEmail(String email) {
            return members.containsKey(email);
        }

        @Override
        public Optional<Member> findByEmail(String email) {
            findByEmailCallCount++;
            return Optional.ofNullable(members.get(email));
        }

        @Override
        public Optional<Member> findById(long memberId) {
            return members.values().stream().filter(member -> member.id() == memberId).findFirst();
        }
    }

    /**
     * 실패 카운터 스텁. {@code unavailable = true} 는 Redis 장애 시 어댑터의 fail-open 반환값
     * (잠금 아님 / 카운트 0)을 흉내낸다.
     */
    private static final class StubLoginAttemptStorePort implements LoginAttemptStorePort {

        private final Map<String, Long> failureCounts = new HashMap<>();
        private final Map<String, Duration> locks = new HashMap<>();
        private boolean unavailable;

        @Override
        public boolean isLocked(String email) {
            if (unavailable) {
                return false;
            }
            return locks.containsKey(email);
        }

        @Override
        public long increaseFailureCount(String email, Duration ttl) {
            if (unavailable) {
                return 0L;
            }
            return failureCounts.merge(email, 1L, Long::sum);
        }

        @Override
        public void lock(String email, Duration lockDuration) {
            if (unavailable) {
                return;
            }
            locks.put(email, lockDuration);
            failureCounts.remove(email);
        }

        @Override
        public void clearFailures(String email) {
            failureCounts.remove(email);
            locks.remove(email);
        }
    }
}
