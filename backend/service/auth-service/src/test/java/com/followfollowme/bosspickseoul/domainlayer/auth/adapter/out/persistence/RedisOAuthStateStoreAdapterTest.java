package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthConsentSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.model.OAuthSignupConsent;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.OAuthStateQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * state 저장 형식과 일회성 소비를 고정한다.
 *
 * <p>state 하나에 provider 와 동의(판·시각 포함)가 함께 실리지만 Hash 가 아니라 <b>String 하나(JSON)</b>에 담겨야 GETDEL
 * 일회성이 유지된다. Redis 왕복 없이 확인할 수 있도록 {@code opsForValue()} 만 대역으로 바꾼다.
 */
class RedisOAuthStateStoreAdapterTest {

    private static final String KEY = "test:auth:oauthState:abc";
    private static final LocalDateTime AGREED_AT = LocalDateTime.of(2026, 10, 6, 9, 30, 15, 123_456_000);
    private static final OAuthConsentSnapshot AGREED_ALL =
        new OAuthConsentSnapshot(new OAuthSignupConsent(true, true, true), "1.0", "1.1", AGREED_AT);

    private ValueOperations<String, String> valueOperations;
    private RedisTemplate<String, String> redisTemplate;
    private RedisOAuthStateStoreAdapter adapter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(RedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        adapter = new RedisOAuthStateStoreAdapter(
            redisTemplate, new RedisProperties(null, null, null, null, null, List.of(), "test"), new ObjectMapper());
    }

    @Test
    @DisplayName("provider·동의·판·시각을 JSON 한 덩어리로 String 키 하나에 TTL 과 함께 저장한다 (Hash 를 쓰지 않는다)")
    void save_writesSingleJsonString() {
        OAuthConsentSnapshot snapshot = new OAuthConsentSnapshot(new OAuthSignupConsent(true, false, true), "1.0", "1.1", AGREED_AT);
        adapter.save("abc", OAuthProvider.KAKAO, snapshot, Duration.ofMinutes(10));

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(eq(KEY), payload.capture(), eq(Duration.ofMinutes(10)));
        verify(redisTemplate, never()).opsForHash();
        assertThat(payload.getValue()).contains(
            "\"provider\":\"KAKAO\"", "\"termsAgreed\":true", "\"privacyAgreed\":false", "\"ageOver14Confirmed\":true",
            "\"termsVersion\":\"1.0\"", "\"privacyVersion\":\"1.1\"", "\"agreedAt\":\"2026-10-06T09:30:15.123456\"");
    }

    @Test
    @DisplayName("저장한 값을 GETDEL 로 꺼내면 provider·동의·판·시각이 그대로 돌아오고, 두 번째 소비는 비어 있다")
    void consume_roundTripsAndIsOneTime() {
        adapter.save("abc", OAuthProvider.NAVER, AGREED_ALL, Duration.ofMinutes(10));
        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(anyString(), payload.capture(), any(Duration.class));
        // GETDEL 은 처음에만 값을 주고 그 뒤로는 키가 없다.
        when(valueOperations.getAndDelete(KEY)).thenReturn(payload.getValue()).thenReturn(null);

        assertThat(adapter.consume("abc")).contains(new OAuthStateQueryResult(OAuthProvider.NAVER, AGREED_ALL));
        assertThat(adapter.consume("abc")).isEmpty();
        // 조회와 삭제를 나눠 부르면 그 사이에 같은 state 를 두 번 소비할 수 있다.
        verify(valueOperations, never()).get(anyString());
    }

    @Test
    @DisplayName("동의를 싣기 전 배포가 남긴 맨 문자열 state 는 provider 만 살리고 동의는 받지 않은 것으로 읽는다")
    void deserialize_legacyPlainProvider_keepsProviderWithoutConsent() {
        assertThat(adapter.deserialize("KAKAO")).contains(new OAuthStateQueryResult(OAuthProvider.KAKAO, OAuthConsentSnapshot.none()));
    }

    @Test
    @DisplayName("판·시각이 없는 JSON(판을 싣기 전 형식)은 동의 플래그가 true 여도 동의 없음으로 읽는다")
    void deserialize_withoutVersions_isReadAsNoConsent() {
        OAuthStateQueryResult result = adapter.deserialize(
            "{\"provider\":\"KAKAO\",\"termsAgreed\":true,\"privacyAgreed\":true,\"ageOver14Confirmed\":true}").orElseThrow();

        assertThat(result.provider()).isEqualTo(OAuthProvider.KAKAO);
        assertThat(result.consent().documentsAgreed()).isFalse();
        assertThat(result.consent().ageOver14Confirmed()).isFalse();
    }

    @Test
    @DisplayName("동의 시각을 읽을 수 없으면 동의 없음으로 읽는다")
    void deserialize_unreadableAgreedAt_isReadAsNoConsent() {
        OAuthStateQueryResult result = adapter.deserialize("{\"provider\":\"KAKAO\",\"termsAgreed\":true,\"privacyAgreed\":true,"
            + "\"ageOver14Confirmed\":true,\"termsVersion\":\"1.0\",\"privacyVersion\":\"1.1\",\"agreedAt\":\"yesterday\"}").orElseThrow();

        assertThat(result.consent().documentsAgreed()).isFalse();
    }

    @Test
    @DisplayName("JSON 에 동의 플래그가 빠져 있으면 동의하지 않은 것으로 읽는다")
    void deserialize_missingConsentFields_defaultsToNotAgreed() {
        OAuthStateQueryResult result = adapter.deserialize("{\"provider\":\"KAKAO\",\"termsAgreed\":true,"
            + "\"termsVersion\":\"1.0\",\"privacyVersion\":\"1.1\",\"agreedAt\":\"2026-10-06T09:30:15\"}").orElseThrow();

        assertThat(result.consent().consent()).isEqualTo(new OAuthSignupConsent(true, false, false));
    }

    @Test
    @DisplayName("해석할 수 없는 값은 무효 state 로 처리한다")
    void deserialize_unreadable_isEmpty() {
        assertThat(adapter.deserialize("UNKNOWN_PROVIDER")).isEmpty();
        assertThat(adapter.deserialize("{\"provider\":\"LINE\",\"termsAgreed\":true}")).isEmpty();
        assertThat(adapter.deserialize("{\"termsAgreed\":true}")).isEmpty();
        assertThat(adapter.deserialize("{broken")).isEmpty();
    }
}
