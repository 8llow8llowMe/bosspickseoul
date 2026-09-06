package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshSessionMeta;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshTokenRotationResult;
import com.followfollowme.bosspickseoul.global.properties.AuthSessionProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProperties;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/** 실제 로컬 Redis에서 Lua 원자성과 TTL을 검증한다. UUID 접두어의 테스트 키만 정리한다. */
@EnabledIfEnvironmentVariable(named = "AUTH_TEST_REDIS_PORT", matches = "\\d+")
class RedisJwtTokenStoreAdapterIntegrationTest {

    private static final long MEMBER_ID = 1L;
    private static final Duration TTL = Duration.ofMinutes(5);
    private final RefreshSessionMeta meta = new RefreshSessionMeta("device-A", LocalDateTime.of(2026, 1, 1, 0, 0));
    private LettuceConnectionFactory connectionFactory;
    private RedisTemplate<String, String> redis;
    private RedisJwtTokenStoreAdapter adapter;
    private String prefix;

    @BeforeEach
    void setUp() {
        prefix = "auth-rotation-test:" + UUID.randomUUID();
        String host = System.getenv().getOrDefault("AUTH_TEST_REDIS_HOST", "127.0.0.1");
        connectionFactory = new LettuceConnectionFactory(host, Integer.parseInt(System.getenv("AUTH_TEST_REDIS_PORT")));
        connectionFactory.afterPropertiesSet();
        redis = new RedisTemplate<>();
        redis.setConnectionFactory(connectionFactory);
        redis.setKeySerializer(new StringRedisSerializer());
        redis.setValueSerializer(jsonSerializer());
        redis.afterPropertiesSet();
        adapter = new RedisJwtTokenStoreAdapter(redis,
            new JwtAuthProperties("unused", Duration.ofMinutes(30), "unused", TTL),
            new RedisProperties(null, null, null, null, null, List.of(), prefix),
            new AuthSessionProperties(5));
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private RedisSerializer<String> jsonSerializer() {
        return (RedisSerializer) new GenericJackson2JsonRedisSerializer();
    }

    @AfterEach
    void tearDown() {
        try {
            var keys = redis.keys(prefix + ":*");
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
        } finally {
            connectionFactory.destroy();
        }
    }

    @Test
    void concurrentRotation_consumesOldTokenExactlyOnce_andPreservesOtherDeviceAndMetadata() throws Exception {
        adapter.save(MEMBER_ID, "old", "old-token", meta);
        adapter.save(MEMBER_ID, "other", "other-token", meta);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return rotate("first"); });
            var second = executor.submit(() -> { start.await(); return rotate("second"); });
            start.countDown();
            var firstResult = first.get(5, TimeUnit.SECONDS);
            var secondResult = second.get(5, TimeUnit.SECONDS);

            assertThat(List.of(firstResult, secondResult))
                .containsExactlyInAnyOrder(RefreshTokenRotationResult.ROTATED, RefreshTokenRotationResult.MISSING);
            String winner = firstResult == RefreshTokenRotationResult.ROTATED ? "first" : "second";
            assertThat(adapter.find(MEMBER_ID, "old")).isEmpty();
            assertThat(adapter.findSessionMeta(MEMBER_ID, "old")).isEmpty();
            assertThat(adapter.find(MEMBER_ID, "other")).contains("other-token");
            assertThat(adapter.findSessionMeta(MEMBER_ID, winner)).contains(meta);
            assertThat(adapter.findAllSessions(MEMBER_ID)).extracting(session -> session.sessionId())
                .containsExactlyInAnyOrder(winner, "other");
            assertThat(redis.getExpire(key("refreshToken", winner), TimeUnit.MILLISECONDS)).isBetween(1L, TTL.toMillis());
            assertThat(redis.getExpire(key("refreshSessionMeta", winner), TimeUnit.MILLISECONDS)).isBetween(1L, TTL.toMillis());
            assertThat(rotate("replay")).isEqualTo(RefreshTokenRotationResult.MISSING);
            assertThat(adapter.find(MEMBER_ID, "replay")).isEmpty();
        }
    }

    @Test
    void tokenMismatch_doesNotConsumeStoredSessionOrCreateReplacement() {
        adapter.save(MEMBER_ID, "old", "different-token", meta);

        assertThat(rotate("new")).isEqualTo(RefreshTokenRotationResult.TOKEN_MISMATCH);
        assertThat(adapter.find(MEMBER_ID, "old")).contains("different-token");
        assertThat(adapter.find(MEMBER_ID, "new")).isEmpty();
        assertThat(adapter.findSessionMeta(MEMBER_ID, "old")).contains(meta);
    }

    @Test
    void expiredToken_doesNotCreateReplacementEvenWhenIndexAndMetadataRemain() {
        adapter.save(MEMBER_ID, "old", "old-token", meta);
        redis.expireAt(key("refreshToken", "old"), java.time.Instant.EPOCH);

        assertThat(rotate("new")).isEqualTo(RefreshTokenRotationResult.MISSING);
        assertThat(adapter.find(MEMBER_ID, "new")).isEmpty();
        assertThat(adapter.findAllSessions(MEMBER_ID)).isEmpty();
    }

    @Test
    void missingMetadata_usesFallback() {
        adapter.save(MEMBER_ID, "old", "old-token", meta);
        redis.delete(key("refreshSessionMeta", "old"));
        RefreshSessionMeta fallback = new RefreshSessionMeta("unknown", LocalDateTime.of(2026, 2, 1, 0, 0));

        assertThat(adapter.rotate(MEMBER_ID, "old", "old-token", "new", "new-token", fallback))
            .isEqualTo(RefreshTokenRotationResult.ROTATED);
        assertThat(adapter.findSessionMeta(MEMBER_ID, "new")).contains(fallback);
    }

    @Test
    void logoutBeforeRotation_preventsSessionResurrection() {
        adapter.save(MEMBER_ID, "old", "old-token", meta);
        adapter.deleteSession(MEMBER_ID, "old");

        assertThat(rotate("new")).isEqualTo(RefreshTokenRotationResult.MISSING);
        assertThat(adapter.find(MEMBER_ID, "new")).isEmpty();
    }

    @Test
    void allSessionRevocationRacingRotation_leavesNoRefreshToken() throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            for (int attempt = 0; attempt < 30; attempt++) {
                adapter.save(MEMBER_ID, "old", "old-token", meta);
                CountDownLatch start = new CountDownLatch(1);
                var rotation = executor.submit(() -> { start.await(); return rotate("new"); });
                var revocation = executor.submit(() -> { start.await(); adapter.deleteAllSessions(MEMBER_ID); return true; });
                start.countDown();
                assertThat(rotation.get(5, TimeUnit.SECONDS)).isIn(RefreshTokenRotationResult.ROTATED, RefreshTokenRotationResult.MISSING);
                assertThat(revocation.get(5, TimeUnit.SECONDS)).isTrue();
                assertThat(adapter.find(MEMBER_ID, "old")).isEmpty();
                assertThat(adapter.find(MEMBER_ID, "new")).isEmpty();
                assertThat(adapter.findSessionMeta(MEMBER_ID, "new")).isEmpty();
                assertThat(adapter.findAllSessions(MEMBER_ID)).isEmpty();
            }
        }
    }

    private RefreshTokenRotationResult rotate(String newSessionId) {
        return adapter.rotate(MEMBER_ID, "old", "old-token", newSessionId, newSessionId + "-token", meta);
    }

    private String key(String type, String sessionId) {
        return prefix + ":auth:" + type + ":" + MEMBER_ID + ":" + sessionId;
    }
}
