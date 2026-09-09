package com.followfollowme.bosspickseoul.apigateway.jwt;

import com.followfollowme.bosspickseoul.apigateway.jwt.exception.JwtErrorCode;
import com.followfollowme.bosspickseoul.apigateway.jwt.exception.JwtException;
import com.followfollowme.bosspickseoul.apigateway.jwt.properties.JwtVerificationProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.util.Date;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 회원 단위 revocation 마커 검사.
 *
 * <p>{@link AccessTokenBlacklistChecker} 는 <b>토큰 하나</b>(jti)만 무효화한다. 비밀번호 변경·제거·
 * 탈퇴처럼 전 기기를 끊어야 하는 사건에서는 요청을 보낸 기기의 access 만 블랙리스트에 오르고,
 * 다른 기기가 들고 있는 access 는 만료까지 그대로 통했다. auth-service 가 세션 무효화 시각을
 * 회원별로 남기고, 게이트웨이는 그보다 먼저 발급된 토큰을 여기서 거절한다.
 *
 * <p>auth-service 의 {@code RedisJwtTokenStoreAdapter} 와 <b>같은 키·같은 직렬화</b>를 써야 한다.
 * 그래서 {@code RedisTemplate<String, Object>}(JSON 직렬화)가 아니라 {@link StringRedisTemplate}
 * 을 쓴다 — 쓰는 쪽이 평문 문자열이라 JSON 역직렬화기로 읽으면 값이 어긋난다.
 * (기존 블랙리스트 체커가 JSON 템플릿으로도 멀쩡한 것은 {@code hasKey} 만 보고 값을 읽지 않기 때문이다.)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MemberRevocationChecker {

    private final StringRedisTemplate stringRedisTemplate;
    private final JwtVerificationProperties jwtVerificationProperties;
    private final RedisProperties redisProperties;

    /**
     * 이 토큰이 회원 단위 무효화에 걸리는지 본다.
     *
     * <p><b>iat == revokedAt 은 무효로 본다.</b> iat 가 초 단위라 같은 초에 발급된 토큰이 revoke 보다
     * 앞선 것인지 구분할 수 없다. 통과시키면 revoke 직전 발급 토큰이 access 만료까지 살아남아 이
     * 기능이 막으려던 구멍이 그대로 남고, 거절하면 같은 초에 재로그인한 사용자가 한 번 더 로그인하면
     * 된다. iat 클레임이 없는 토큰(0)도 같은 규칙으로 걸린다.
     */
    public boolean isRevoked(String memberId, Date issuedAt) {
        if (!StringUtils.hasText(memberId)) {
            return false;
        }

        long revokedAtEpochSeconds = findRevokedAtEpochSeconds(memberId);
        if (revokedAtEpochSeconds <= 0) {
            return false;
        }

        long issuedAtEpochSeconds = issuedAt == null ? 0L : issuedAt.toInstant().getEpochSecond();
        return issuedAtEpochSeconds <= revokedAtEpochSeconds;
    }

    private long findRevokedAtEpochSeconds(String memberId) {
        try {
            String value = stringRedisTemplate.opsForValue().get(buildKey(memberId));
            return value == null ? 0L : Long.parseLong(value);
        } catch (DataAccessException | NumberFormatException e) {
            // 값을 못 읽는 것도 Redis 에 못 닿는 것과 같은 "판정 불가" 라, 블랙리스트와 동일한 정책을 쓴다.
            log.error("[MemberRevocationChecker] 회원 revocation 마커 조회 실패: memberId={}, error={}",
                memberId, e.getMessage());
            if (jwtVerificationProperties.blacklistFailOpen()) {
                return 0L;
            }
            throw new JwtException(JwtErrorCode.TOKEN_VERIFICATION_UNAVAILABLE);
        }
    }

    private String buildKey(String memberId) {
        return redisProperties.normalizedKeyPrefix() + ":auth:memberRevokedAt:" + memberId;
    }
}
