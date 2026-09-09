package com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.GeneralLoginInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.LoginAttemptStorePort;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.global.properties.LoginAttemptProperties;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
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
    private static final int IP_MAX_FAIL_COUNT = 5;
    private static final String CLIENT_IP = "203.0.113.10";

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
            new LoginAttemptProperties(MAX_FAILURE_COUNT, Duration.ofMinutes(10), IP_MAX_FAIL_COUNT, Duration.ofHours(1))
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

    @Test
    void generalLogin_manyEmailsFromOneIp_isBlockedByIpLimitEvenThoughNoEmailIsLocked() {
        // 이메일을 매번 바꾸면 계정 단위 잠금(AUTH_015)에는 걸리지 않는다 — IP 축이 없으면 무제한이다.
        exhaustIpLimitWithRotatingEmails();

        // 상한을 채운 다음 요청부터 이메일과 무관하게 AUTH_020 으로 거절된다.
        assertThatThrownBy(() -> processor.generalLogin(command("victim-99@example.com", "wrong-password")))
            .isInstanceOf(AuthException.class)
            .extracting(t -> ((AuthException) t).getErrorCode())
            .isEqualTo(AuthErrorCode.LOGIN_IP_RATE_LIMITED);
    }

    @Test
    void generalLogin_ipLimitReached_skipsMemberLookupAndBlocksEvenCorrectPassword() {
        // 이메일을 돌려가며 IP 상한만 채운다 — 계정 잠금(AUTH_015)이 먼저 걸리면 IP 축을 검증할 수 없다.
        exhaustIpLimitWithRotatingEmails();

        // IP 상한은 이메일 잠금보다 먼저 검사하므로 DB 조회/bcrypt 비용이 발생하지 않는다.
        // 비밀번호가 맞아도, 그 이메일이 한 번도 실패한 적 없어도 거절된다.
        memberRepositoryPort.findByEmailCallCount = 0;
        assertThatThrownBy(() -> processor.generalLogin(command(EMAIL, RAW_PASSWORD)))
            .isInstanceOf(AuthException.class)
            .extracting(t -> ((AuthException) t).getErrorCode())
            .isEqualTo(AuthErrorCode.LOGIN_IP_RATE_LIMITED);
        assertThat(memberRepositoryPort.findByEmailCallCount).isZero();
    }

    @Test
    void generalLogin_otherIp_isNotAffectedByAnotherIpFailures() {
        exhaustIpLimitWithRotatingEmails();

        // 카운터는 IP 별로 분리된다 — 공격자 IP 상한이 정상 사용자를 막지 않는다.
        GeneralLoginInfo info = processor.generalLogin(command(EMAIL, RAW_PASSWORD, "198.51.100.7"));
        assertThat(info.memberId()).isEqualTo(1L);
    }

    @Test
    void generalLogin_successfulLogin_doesNotResetIpCounter() {
        assertLoginFailed("wrong-password");
        processor.generalLogin(command(EMAIL, RAW_PASSWORD));

        // 자기 계정 로그인 한 번으로 IP 상한을 초기화할 수 있으면 상한이 무의미해진다.
        assertThat(loginAttemptStorePort.ipFailureCounts.get(CLIENT_IP)).isEqualTo(1L);
    }

    @Test
    void generalLogin_unknownClientIp_skipsIpLimitInsteadOfSharingOneCounter() {
        // IP 를 못 얻은 요청들이 빈 문자열 키를 공유하면 서로를 잠근다. 그럴 바엔 IP 축을 적용하지 않는다.
        for (int attempt = 0; attempt < IP_MAX_FAIL_COUNT + 2; attempt++) {
            String rotatingEmail = "unknown-ip-" + attempt + "@example.com";
            assertThatThrownBy(() -> processor.generalLogin(command(rotatingEmail, "wrong-password", null)))
                .isInstanceOf(AuthException.class)
                .extracting(t -> ((AuthException) t).getErrorCode())
                .isEqualTo(AuthErrorCode.LOGIN_FAILED);
        }
        assertThat(loginAttemptStorePort.ipFailureCounts).isEmpty();
    }

    @Test
    void generalLogin_counterStoreUnavailable_failsOpenOnIpLimitToo() {
        loginAttemptStorePort.unavailable = true;

        for (int attempt = 0; attempt < IP_MAX_FAIL_COUNT + 2; attempt++) {
            String rotatingEmail = "unavailable-" + attempt + "@example.com";
            assertThatThrownBy(() -> processor.generalLogin(command(rotatingEmail, "wrong-password")))
                .isInstanceOf(AuthException.class);
        }

        // 저장소 장애로 IP 상한까지 막아버리면 정상 사용자 전원이 로그인 불가가 된다.
        GeneralLoginInfo info = processor.generalLogin(command(EMAIL, RAW_PASSWORD));
        assertThat(info.memberId()).isEqualTo(1L);
    }

    /** 계정 잠금을 건드리지 않고 IP 상한만 정확히 채운다 (이메일마다 실패 1회씩). */
    private void exhaustIpLimitWithRotatingEmails() {
        for (int attempt = 0; attempt < IP_MAX_FAIL_COUNT; attempt++) {
            String rotatingEmail = "victim-" + attempt + "@example.com";
            assertThatThrownBy(() -> processor.generalLogin(command(rotatingEmail, "wrong-password")))
                .isInstanceOf(AuthException.class)
                .extracting(t -> ((AuthException) t).getErrorCode())
                .isEqualTo(AuthErrorCode.LOGIN_FAILED);
        }
        assertThat(loginAttemptStorePort.locks).isEmpty();
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
        return command(email, password, CLIENT_IP);
    }

    private AuthGeneralLoginCommand command(String email, String password, String clientIp) {
        return AuthGeneralLoginCommand.builder().email(email).password(password).clientIp(clientIp).build();
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

        @Override
        public java.util.List<Member> findAllByIds(java.util.Collection<Long> memberIds) {
            throw new UnsupportedOperationException("not used in this test");
        }
    }

    /**
     * 실패 카운터 스텁. {@code unavailable = true} 는 Redis 장애 시 어댑터의 fail-open 반환값
     * (잠금 아님 / 카운트 0)을 흉내낸다.
     */
    private static final class StubLoginAttemptStorePort implements LoginAttemptStorePort {

        private final Map<String, Long> failureCounts = new HashMap<>();
        private final Map<String, Duration> locks = new HashMap<>();
        private final Map<String, Long> ipFailureCounts = new HashMap<>();
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

        @Override
        public long getIpFailureCount(String clientIp) {
            if (unavailable) {
                return 0L;
            }
            return ipFailureCounts.getOrDefault(clientIp, 0L);
        }

        @Override
        public long increaseIpFailureCount(String clientIp, Duration window) {
            if (unavailable) {
                return 0L;
            }
            return ipFailureCounts.merge(clientIp, 1L, Long::sum);
        }
    }
}
