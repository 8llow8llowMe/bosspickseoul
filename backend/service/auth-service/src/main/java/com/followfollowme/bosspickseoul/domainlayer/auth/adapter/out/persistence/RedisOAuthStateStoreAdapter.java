package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthConsentSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthSignupConsent;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.OAuthStateStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthStateQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * state 한 건에 provider 와 소셜 첫 가입 동의(인가 시점의 문서 판·동의 시각 포함)를 함께 보관한다.
 *
 * <p>보관할 값이 여러 개지만 <b>Redis Hash 를 쓰지 않는다.</b> state 의 일회성은 GETDEL 의 원자성에 기대는데 GETDEL 은
 * Hash 에 먹지 않는다 — HGETALL + DEL 로 나누면 그 사이에 같은 state 를 두 번 소비할 수 있다. 그래서 JSON 한 덩어리로
 * 직렬화해 String 하나에 넣는다. 직렬화는 서비스 {@link ObjectMapper} 로 직접 하고, 시각은 ISO 문자열로 담는다(redis-core
 * 규칙 — 기본 {@code RedisTemplate} 의 Jackson 직렬화나 java.time 모듈 유무에 기대지 않는다).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisOAuthStateStoreAdapter implements OAuthStateStorePort {

    private final RedisTemplate<String, String> redisTemplate;
    private final RedisProperties redisProperties;
    private final ObjectMapper objectMapper;

    @Override
    public void save(String state, OAuthProvider provider, OAuthConsentSnapshot consent, Duration ttl) {
        redisTemplate.opsForValue().set(buildKey(state), serialize(provider, consent), ttl);
    }

    @Override
    public Optional<OAuthStateQueryResult> consume(String state) {
        // GETDEL(Redis 6.2+)로 조회와 삭제를 원자적으로 수행해 state 재사용을 차단한다.
        String payload = redisTemplate.opsForValue().getAndDelete(buildKey(state));
        if (payload == null) {
            return Optional.empty();
        }

        return deserialize(payload);
    }

    private String serialize(OAuthProvider provider, OAuthConsentSnapshot snapshot) {
        OAuthSignupConsent consent = snapshot.consent();
        String agreedAt = snapshot.agreedAt() == null ? null : snapshot.agreedAt().toString();
        try {
            return objectMapper.writeValueAsString(new StatePayload(
                provider.name(), consent.termsAgreed(), consent.privacyAgreed(), consent.ageOver14Confirmed(),
                snapshot.termsVersion(), snapshot.privacyVersion(), agreedAt));
        } catch (JsonProcessingException e) {
            // 필드가 문자열과 boolean 뿐이라 실무상 발생하지 않는다. 그래도 삼키면 state 없는 인가 URL 이 나가
            // 콜백이 전부 실패하므로, 여기서 끊어 원인을 남긴다.
            throw new IllegalStateException("OAuth state 직렬화에 실패했습니다.", e);
        }
    }

    /**
     * 저장된 값을 해석한다. 세 가지 모양이 들어올 수 있다.
     * <ul>
     *   <li>JSON — 현재 형식. 문서 판이나 동의 시각이 빠졌거나 읽을 수 없으면(판을 싣기 전 형식) provider 만 살리고 동의는
     *       "받지 않음" 으로 읽는다. 판을 모르는 동의는 이력으로 남길 수 없다.</li>
     *   <li>맨 문자열({@code "KAKAO"}) — 동의를 싣기 전 배포가 남긴 state. 배포 직후 TTL(10분) 안에만 생긴다. 무효로 버리면
     *       인가 화면을 막 지나온 기존 회원까지 로그인이 깨지므로, provider 만 살리고 동의는 "받지 않음" 으로 읽는다.</li>
     *   <li>그 밖 — enum 상수명이 바뀐 배포와 TTL 이 겹친 경우 등. 무효 state 로 처리한다.</li>
     * </ul>
     * 두 "받지 않음" 경우 모두 기존 회원은 그대로 로그인되고, 신규 회원은 동의 누락(AUTH_021)으로 동의 화면부터 다시 밟는다.
     *
     * <p>패키지 공개 — Redis 왕복 없이 해석 규칙만 고정하려고 테스트가 직접 부른다.
     */
    Optional<OAuthStateQueryResult> deserialize(String payload) {
        try {
            if (!payload.startsWith("{")) {
                return Optional.of(new OAuthStateQueryResult(OAuthProvider.valueOf(payload), OAuthConsentSnapshot.none()));
            }
            StatePayload statePayload = objectMapper.readValue(payload, StatePayload.class);
            if (statePayload.provider() == null) {
                return unreadable(payload);
            }
            OAuthSignupConsent consent = new OAuthSignupConsent(
                statePayload.termsAgreed(), statePayload.privacyAgreed(), statePayload.ageOver14Confirmed());
            OAuthConsentSnapshot snapshot = new OAuthConsentSnapshot(
                consent, statePayload.termsVersion(), statePayload.privacyVersion(), parseAgreedAt(statePayload.agreedAt()));
            return Optional.of(new OAuthStateQueryResult(OAuthProvider.valueOf(statePayload.provider()), snapshot));
        } catch (JsonProcessingException | IllegalArgumentException e) {
            return unreadable(payload);
        }
    }

    /** 읽을 수 없는 시각은 null 로 돌려준다 — {@link OAuthConsentSnapshot} 이 그 동의를 "받지 않음" 으로 바꾼다. */
    private static LocalDateTime parseAgreedAt(String agreedAt) {
        if (agreedAt == null) {
            return null;
        }
        try {
            return LocalDateTime.parse(agreedAt);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private Optional<OAuthStateQueryResult> unreadable(String payload) {
        log.warn("[RedisOAuthStateStoreAdapter] unreadable oauth state payload: value={}", payload);
        return Optional.empty();
    }

    private String buildKey(String state) {
        return redisProperties.normalizedKeyPrefix() + ":auth:oauthState:" + state;
    }

    /**
     * Redis 에 넣는 직렬화 형태. adapter 안에만 있어야 하는 표현이라 application 으로 내보내지 않는다 — 밖으로 나가는 것은
     * {@link OAuthStateQueryResult} 뿐이다. 필드가 빠진 JSON 은 boolean 은 {@code false}, 판·시각은 {@code null} 로 읽혀
     * "동의 안 함" 쪽으로 떨어진다. 묻지 않은 동의를 받았다고 칠 수는 없으니 의도한 방향이다.
     */
    private record StatePayload(
        String provider, boolean termsAgreed, boolean privacyAgreed, boolean ageOver14Confirmed,
        String termsVersion, String privacyVersion, String agreedAt
    ) {

    }
}
