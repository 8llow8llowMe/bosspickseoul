package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.LoginAttemptStorePort;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 로그인 실패 카운터 / 잠금 상태를 Redis 에 보관한다. 키 스키마는 이메일 인증 어댑터와 동일한
 * {@code {prefix}:auth:{type}:{email}} 관례를 따른다.
 *
 * <ul>
 *   <li>{@code {prefix}:auth:loginFail:{email}} — 누적 실패 횟수, TTL = 잠금 시간</li>
 *   <li>{@code {prefix}:auth:loginLock:{email}} — 잠금 플래그, TTL = 잠금 시간</li>
 *   <li>{@code {prefix}:auth:loginFailIp:{ip}} — IP 누적 실패 횟수, TTL = IP 윈도우
 *       (이메일 발송 IP 상한 {@code emailSendIp} 와 동일한 고정 윈도우 방식)</li>
 * </ul>
 *
 * <p><b>Redis 장애 시 정책: fail-open (로그인은 되게 한다).</b> 이 저장소는 비밀번호 검증을
 * 대체하는 게 아니라 시도 횟수를 세는 보조 장치다. Redis 가 흔들릴 때 fail-closed 로 잠그면
 * 정상 사용자 전원이 로그인 불가가 되는데, 이는 brute-force 노출 위험보다 훨씬 큰 사고다.
 * (반대로 {@code RedisJwtTokenStoreAdapter} 의 블랙리스트 조회는 "이미 revoke 된 토큰"을 놓치면
 * 인증 자체가 깨지므로 기본 fail-closed 다 — 성격이 다르다.)
 * 상한이 무력화된 구간을 사후에 알 수 있도록 실패 시 ERROR 로그를 남긴다.
 *
 * <p>로그에는 이메일 원문을 남기지 않는다 (민감정보).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisLoginAttemptStoreAdapter implements LoginAttemptStorePort {

    private static final String LOCKED_VALUE = "locked";

    private final RedisTemplate<String, String> redisTemplate;
    private final RedisProperties redisProperties;

    @Override
    public boolean isLocked(String email) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildLockKey(email)));
        } catch (DataAccessException exception) {
            log.error("[RedisLoginAttemptStoreAdapter] 로그인 잠금 조회 실패(fail-open 처리): error={}",
                exception.getMessage());
            return false;
        }
    }

    @Override
    public long increaseFailureCount(String email, Duration ttl) {
        try {
            String key = buildFailKey(email);
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                // 첫 실패에서만 TTL 을 건다. 매 실패마다 갱신하면 공격자가 카운터를 무한히 살려둘 수 있고,
                // 반대로 정상 사용자는 오래된 실패가 만료돼 카운터가 자연 초기화되어야 한다.
                redisTemplate.expire(key, ttl);
            }
            return count == null ? 0L : count;
        } catch (DataAccessException exception) {
            log.error("[RedisLoginAttemptStoreAdapter] 로그인 실패 카운터 증가 실패(fail-open 처리): error={}",
                exception.getMessage());
            return 0L;
        }
    }

    @Override
    public void lock(String email, Duration lockDuration) {
        try {
            redisTemplate.opsForValue().set(buildLockKey(email), LOCKED_VALUE, lockDuration);
            // 잠금이 걸리면 카운터는 역할을 마쳤다. 잠금 해제 후 다시 0 부터 세도록 지운다.
            redisTemplate.delete(buildFailKey(email));
        } catch (DataAccessException exception) {
            log.error("[RedisLoginAttemptStoreAdapter] 로그인 잠금 설정 실패: error={}", exception.getMessage());
        }
    }

    @Override
    public void clearFailures(String email) {
        try {
            redisTemplate.delete(buildFailKey(email));
            redisTemplate.delete(buildLockKey(email));
        } catch (DataAccessException exception) {
            log.error("[RedisLoginAttemptStoreAdapter] 로그인 실패 카운터 초기화 실패: error={}", exception.getMessage());
        }
    }

    /**
     * IP 상한은 잠금 플래그 없이 카운터 하나만 본다. 이메일 잠금과 달리 "잠갔다"는 상태를 따로
     * 둘 필요가 없다 — 고정 윈도우가 끝나면 키가 만료되며 자연히 풀린다.
     */
    @Override
    public long getIpFailureCount(String clientIp) {
        try {
            String value = redisTemplate.opsForValue().get(buildIpFailKey(clientIp));
            return value == null ? 0L : Long.parseLong(value);
        } catch (DataAccessException | NumberFormatException exception) {
            log.error("[RedisLoginAttemptStoreAdapter] IP 로그인 실패 카운터 조회 실패(fail-open 처리): error={}",
                exception.getMessage());
            return 0L;
        }
    }

    @Override
    public long increaseIpFailureCount(String clientIp, Duration window) {
        try {
            String key = buildIpFailKey(clientIp);
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1L) {
                // 첫 실패에서만 TTL 을 걸어 고정 윈도우를 만든다. 매 실패마다 갱신하면 공격자가
                // 시도를 이어가는 동안 윈도우가 끝나지 않아 IP 가 영구히 막힌다.
                redisTemplate.expire(key, window);
            }
            return count == null ? 0L : count;
        } catch (DataAccessException exception) {
            log.error("[RedisLoginAttemptStoreAdapter] IP 로그인 실패 카운터 증가 실패(fail-open 처리): error={}",
                exception.getMessage());
            return 0L;
        }
    }

    private String buildFailKey(String email) {
        return buildKey("loginFail", email);
    }

    private String buildLockKey(String email) {
        return buildKey("loginLock", email);
    }

    private String buildIpFailKey(String clientIp) {
        return buildKey("loginFailIp", clientIp);
    }

    private String buildKey(String type, String email) {
        return redisProperties.normalizedKeyPrefix() + ":auth:" + type + ":" + email;
    }
}
