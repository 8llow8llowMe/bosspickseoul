package com.followfollowme.bosspickseoul.domainlayer.auth.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenIssueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.JwtTokenReissueInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.info.RefreshSessionInfo;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshSessionMeta;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshTokenRotationResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.RefreshSessionQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.member.application.port.out.MemberRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProperties;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProvider;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityJwtException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;

class JwtTokenProcessorTest {

    private static final long MEMBER_ID = 1L;
    private static final String ACCESS_KEY = "test-access-key-test-access-key-test-access-key-test-access-key!!";
    private static final String REFRESH_KEY = "test-refresh-key-test-refresh-key-test-refresh-key-test-refresh!!";

    private JwtAuthProvider jwtAuthProvider;
    private StubJwtTokenStorePort tokenStorePort;
    private StubMemberRepositoryPort memberRepositoryPort;
    private JwtTokenProcessor processor;

    @BeforeEach
    void setUp() {
        JwtAuthProperties properties = new JwtAuthProperties(
            ACCESS_KEY, Duration.ofMinutes(30), REFRESH_KEY, Duration.ofDays(14));
        jwtAuthProvider = new JwtAuthProvider(properties);
        tokenStorePort = new StubJwtTokenStorePort();
        memberRepositoryPort = new StubMemberRepositoryPort();
        memberRepositoryPort.register(activeMember());
        processor = new JwtTokenProcessor(jwtAuthProvider, properties, tokenStorePort, memberRepositoryPort);
    }

    @Test
    void issueTokens_twice_keepsBothDeviceSessions() {
        // 두 기기에서 각각 로그인해도 서로의 세션을 덮어쓰지 않는다
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");

        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(2);
    }

    @Test
    void reissueTokens_rotatesSessionWithoutGrowingCount() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");

        JwtTokenReissueInfo reissued = processor.reissueTokens(issued.refreshToken());

        // 이전 세션 키를 지우고 새 키로 교체하므로 세션 수는 늘지 않고 토큰은 항상 바뀐다
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(1);
        assertThat(reissued.newRefreshToken()).isNotEqualTo(issued.refreshToken());
    }

    @Test
    void reissueTokens_withRotatedOutToken_rejects() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        processor.reissueTokens(issued.refreshToken());

        // 회전 전 토큰의 세션 키는 삭제되어 재사용(탈취 재생) 시 거부된다
        assertThatThrownBy(() -> processor.reissueTokens(issued.refreshToken()))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.EXPIRED_REFRESH_TOKEN);
    }

    @Test
    void reissueTokens_withExpiredJwt_preservesSecurityExpiredResponse() {
        JwtAuthProvider expiredTokenProvider = new JwtAuthProvider(new JwtAuthProperties(
            ACCESS_KEY, Duration.ofMinutes(30), REFRESH_KEY, Duration.ofSeconds(-1)));
        String expiredToken = expiredTokenProvider.issueRefreshToken(MEMBER_ID, "expired");

        assertThatThrownBy(() -> processor.reissueTokens(expiredToken))
            .isInstanceOf(SecurityJwtException.class)
            .extracting(exception -> ((SecurityJwtException) exception).getErrorCode())
            .isEqualTo(SecurityErrorCode.TOKEN_EXPIRED);
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isZero();
    }

    @Test
    void reissueTokens_concurrentlyWithSameToken_allowsExactlyOneRequest() throws Exception {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        tokenStorePort.synchronizeNextTwoFinds();
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            List<Future<Boolean>> results = executor.invokeAll(List.of(
                () -> reissueSucceeds(issued.refreshToken()),
                () -> reissueSucceeds(issued.refreshToken())
            ));

            assertThat(results).extracting(Future::get).containsExactlyInAnyOrder(true, false);
            assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void issueTokens_whenTokenStoreWriteFails_returnsServiceUnavailable() {
        tokenStorePort.failWrites = true;

        assertThatThrownBy(() -> processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device"))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.TOKEN_STORE_UNAVAILABLE);
    }

    @Test
    void reissueTokens_whenTokenStoreRotationFails_returnsServiceUnavailable() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        tokenStorePort.failRotations = true;

        assertThatThrownBy(() -> processor.reissueTokens(issued.refreshToken()))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.TOKEN_STORE_UNAVAILABLE);
    }

    @Test
    void reissueTokens_whenLogoutWinsAfterLookup_returnsExpiredWithoutNewSession() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        tokenStorePort.beforeRotation = () -> processor.revokeCurrentSession(MEMBER_ID, "access-id", issued.refreshToken());

        assertThatThrownBy(() -> processor.reissueTokens(issued.refreshToken()))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.EXPIRED_REFRESH_TOKEN);
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isZero();
        assertThat(tokenStorePort.blacklistedTokenIds).contains("access-id");
    }

    @Test
    void reissueTokens_whenStoredTokenChangesAfterLookup_returnsInvalidWithoutNewSession() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        tokenStorePort.beforeRotation = () -> tokenStorePort.tokens.replaceAll((key, token) -> "changed-token");

        assertThatThrownBy(() -> processor.reissueTokens(issued.refreshToken()))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.INVALID_REFRESH_TOKEN);
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(1);
        assertThat(tokenStorePort.tokens.values()).containsExactly("changed-token");
    }

    @Test
    void reissueTokens_whenTokenStoreReadFails_returnsServiceUnavailable() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        tokenStorePort.failReads = true;

        assertThatThrownBy(() -> processor.reissueTokens(issued.refreshToken()))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.TOKEN_STORE_UNAVAILABLE);
    }

    @Test
    void reissueTokens_withEvictedSession_rejectsAsExpired() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        tokenStorePort.deleteAllSessions(MEMBER_ID);

        // 상한 초과로 밀려났거나 무효화된 세션은 재로그인 대상이다
        assertThatThrownBy(() -> processor.reissueTokens(issued.refreshToken()))
            .isInstanceOf(AuthException.class)
            .extracting(exception -> ((AuthException) exception).getErrorCode())
            .isEqualTo(AuthErrorCode.EXPIRED_REFRESH_TOKEN);
    }

    @Test
    void revokeCurrentSession_removesOnlyThatDevice() {
        JwtTokenIssueInfo deviceA = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        JwtTokenIssueInfo deviceB = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");

        processor.revokeCurrentSession(MEMBER_ID, "access-token-id", deviceA.refreshToken());

        // A 기기 세션만 사라지고 B 기기는 계속 재발급할 수 있다
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(1);
        assertThat(processor.reissueTokens(deviceB.refreshToken())).isNotNull();
        assertThat(tokenStorePort.blacklistedTokenIds).contains("access-token-id");
    }

    @Test
    void revokeCurrentSession_withoutRefreshCookie_onlyBlacklistsAccessToken() {
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");

        processor.revokeCurrentSession(MEMBER_ID, "access-token-id", null);

        // 쿠키가 없으면 세션 특정이 불가하므로 세션은 남고 access 만 무효화된다
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(1);
        assertThat(tokenStorePort.blacklistedTokenIds).contains("access-token-id");
    }

    @Test
    void getSessions_marksCurrentDeviceAndShowsDeviceInfo() {
        JwtTokenIssueInfo deviceA = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "device-A");
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "device-B");

        List<RefreshSessionInfo> sessions = processor.getSessions(MEMBER_ID, deviceA.refreshToken());

        assertThat(sessions).hasSize(2);
        assertThat(sessions).filteredOn(RefreshSessionInfo::current)
            .singleElement()
            .satisfies(current -> assertThat(current.deviceInfo()).isEqualTo("device-A"));
    }

    @Test
    void getSessions_withoutRefreshCookie_marksNothingCurrent() {
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "device-A");

        List<RefreshSessionInfo> sessions = processor.getSessions(MEMBER_ID, null);

        assertThat(sessions).hasSize(1);
        assertThat(sessions.getFirst().current()).isFalse();
    }

    @Test
    void revokeSessionById_removesOnlyTargetSession() {
        JwtTokenIssueInfo deviceA = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "device-A");
        JwtTokenIssueInfo deviceB = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "device-B");
        String deviceASessionId = jwtAuthProvider.parseRefreshToken(deviceA.refreshToken()).tokenId();

        processor.revokeSessionById(MEMBER_ID, deviceASessionId);

        // A 기기만 해제되고 B 기기는 계속 재발급할 수 있다. 이미 없는 세션 해제는 멱등하다.
        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isEqualTo(1);
        assertThat(processor.reissueTokens(deviceB.refreshToken())).isNotNull();
        processor.revokeSessionById(MEMBER_ID, deviceASessionId);
    }

    @Test
    void reissueTokens_carriesOverSessionMeta() {
        JwtTokenIssueInfo issued = processor.issueTokens(MEMBER_ID, SecurityRole.USER, "device-A");
        RefreshSessionMeta originalMeta = tokenStorePort.metas.values().iterator().next();

        JwtTokenReissueInfo reissued = processor.reissueTokens(issued.refreshToken());

        // 회전으로 세션 키가 바뀌어도 기기 정보와 최초 로그인 시각은 이어진다
        String newSessionId = jwtAuthProvider.parseRefreshToken(reissued.newRefreshToken()).tokenId();
        RefreshSessionMeta carried = tokenStorePort.findSessionMeta(MEMBER_ID, newSessionId).orElseThrow();
        assertThat(carried.deviceInfo()).isEqualTo("device-A");
        assertThat(carried.createdAt()).isEqualTo(originalMeta.createdAt());
    }

    @Test
    void revokeAllSessions_removesEveryDevice() {
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");
        processor.issueTokens(MEMBER_ID, SecurityRole.USER, "test-device");

        processor.revokeAllSessions(MEMBER_ID, "access-token-id");

        assertThat(tokenStorePort.sessionCount(MEMBER_ID)).isZero();
        assertThat(tokenStorePort.blacklistedTokenIds).contains("access-token-id");
    }

    private boolean reissueSucceeds(String refreshToken) {
        try {
            processor.reissueTokens(refreshToken);
            return true;
        } catch (AuthException e) {
            return false;
        }
    }

    private Member activeMember() {
        return Member.builder()
            .id(MEMBER_ID)
            .email("member@example.com")
            .nickname("tester")
            .role(SecurityRole.USER)
            .status(MemberStatus.ACTIVE)
            .build();
    }

    private static class StubJwtTokenStorePort implements JwtTokenStorePort {

        private final Map<String, String> tokens = new ConcurrentHashMap<>();
        private final Map<String, RefreshSessionMeta> metas = new ConcurrentHashMap<>();
        private final Set<String> blacklistedTokenIds = new HashSet<>();
        private CountDownLatch concurrentFinds;
        private boolean failWrites;
        private boolean failRotations;
        private boolean failReads;
        private Runnable beforeRotation = () -> {};

        @Override
        public void save(long memberId, String sessionId, String refreshToken, RefreshSessionMeta meta) {
            if (failWrites) {
                throw new RedisConnectionFailureException("Redis unavailable");
            }
            tokens.put(memberId + ":" + sessionId, refreshToken);
            metas.put(memberId + ":" + sessionId, meta);
        }

        @Override
        public synchronized RefreshTokenRotationResult rotate(
            long memberId,
            String currentSessionId,
            String expectedRefreshToken,
            String newSessionId,
            String newRefreshToken,
            RefreshSessionMeta fallbackMeta
        ) {
            beforeRotation.run();
            if (failRotations) {
                throw new RedisConnectionFailureException("Redis unavailable");
            }
            String currentKey = memberId + ":" + currentSessionId;
            String storedToken = tokens.get(currentKey);
            if (storedToken == null) {
                return RefreshTokenRotationResult.MISSING;
            }
            if (!storedToken.equals(expectedRefreshToken)) {
                return RefreshTokenRotationResult.TOKEN_MISMATCH;
            }
            RefreshSessionMeta meta = metas.getOrDefault(currentKey, fallbackMeta);
            tokens.remove(currentKey);
            metas.remove(currentKey);
            tokens.put(memberId + ":" + newSessionId, newRefreshToken);
            metas.put(memberId + ":" + newSessionId, meta);
            return RefreshTokenRotationResult.ROTATED;
        }

        @Override
        public Optional<String> find(long memberId, String sessionId) {
            if (failReads) {
                throw new RedisConnectionFailureException("Redis unavailable");
            }
            awaitConcurrentFinds();
            return Optional.ofNullable(tokens.get(memberId + ":" + sessionId));
        }

        @Override
        public Optional<RefreshSessionMeta> findSessionMeta(long memberId, String sessionId) {
            return Optional.ofNullable(metas.get(memberId + ":" + sessionId));
        }

        @Override
        public List<RefreshSessionQueryResult> findAllSessions(long memberId) {
            return tokens.keySet().stream()
                .filter(key -> key.startsWith(memberId + ":"))
                .map(key -> {
                    String sessionId = key.substring((memberId + ":").length());
                    RefreshSessionMeta meta = metas.get(key);
                    return new RefreshSessionQueryResult(
                        sessionId,
                        meta == null ? null : meta.deviceInfo(),
                        meta == null ? null : meta.createdAt(),
                        LocalDateTime.now());
                })
                .toList();
        }

        @Override
        public void deleteSession(long memberId, String sessionId) {
            tokens.remove(memberId + ":" + sessionId);
            metas.remove(memberId + ":" + sessionId);
        }

        @Override
        public void deleteAllSessions(long memberId) {
            tokens.keySet().removeIf(key -> key.startsWith(memberId + ":"));
            metas.keySet().removeIf(key -> key.startsWith(memberId + ":"));
        }

        @Override
        public void saveAccessTokenIdBlacklist(String tokenId, Duration ttl) {
            blacklistedTokenIds.add(tokenId);
        }

        long sessionCount(long memberId) {
            return tokens.keySet().stream().filter(key -> key.startsWith(memberId + ":")).count();
        }

        void synchronizeNextTwoFinds() {
            concurrentFinds = new CountDownLatch(2);
        }

        private void awaitConcurrentFinds() {
            if (concurrentFinds == null) {
                return;
            }
            concurrentFinds.countDown();
            try {
                if (!concurrentFinds.await(5, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent refresh requests did not reach the token lookup together");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while synchronizing concurrent refresh requests", e);
            }
        }
    }

    private static class StubMemberRepositoryPort implements MemberRepositoryPort {

        private final Map<Long, Member> members = new HashMap<>();

        void register(Member member) {
            members.put(member.id(), member);
        }

        @Override
        public Member save(Member domain) {
            members.put(domain.id(), domain);
            return domain;
        }

        @Override
        public boolean existsByEmail(String email) {
            return members.values().stream().anyMatch(member -> member.email().equals(email));
        }

        @Override
        public Optional<Member> findByEmail(String email) {
            return members.values().stream().filter(member -> member.email().equals(email)).findFirst();
        }

        @Override
        public Optional<Member> findById(long memberId) {
            return Optional.ofNullable(members.get(memberId));
        }
    }
}
