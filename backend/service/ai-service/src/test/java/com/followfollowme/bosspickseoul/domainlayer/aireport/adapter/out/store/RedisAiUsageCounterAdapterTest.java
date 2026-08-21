package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.global.properties.AiReportUsageLimitProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RedisAiUsageCounterAdapterTest {

    private static final long MEMBER_ID = 7L;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    private RedisAiUsageCounterAdapter adapter;

    @BeforeEach
    void setUp() {
        RedisProperties redisProperties =
            new RedisProperties(null, null, null, null, null, null, "bosspickseoul:test");
        adapter = new RedisAiUsageCounterAdapter(
            stringRedisTemplate,
            redisProperties,
            new AiReportJobProperties(86_400L, 2_592_000L, 30L, 300L),
            new AiReportUsageLimitProperties(3)
        );
        when(stringRedisTemplate.opsForHash()).thenReturn(hashOperations);
    }

    @Test
    void tryConsumeDailyQuota_withinLimit_returnsTrueAndUsesDailyUsageKey() {
        when(hashOperations.increment(anyString(), eq("submissions"), anyLong())).thenReturn(3L);

        assertThat(adapter.tryConsumeDailyQuota(MEMBER_ID)).isTrue();
        // 기존 일별 usage 해시를 재사용한다 (신규 키 스키마를 만들지 않는다) + TTL 갱신
        verify(hashOperations).increment(expectedKey(), "submissions", 1L);
        verify(stringRedisTemplate).expire(expectedKey(), 2_592_000L, TimeUnit.SECONDS);
    }

    @Test
    void tryConsumeDailyQuota_overLimit_returnsFalse() {
        when(hashOperations.increment(anyString(), eq("submissions"), anyLong())).thenReturn(4L);

        assertThat(adapter.tryConsumeDailyQuota(MEMBER_ID)).isFalse();
    }

    @Test
    void tryConsumeDailyQuota_redisUnavailable_failsOpen() {
        when(hashOperations.increment(anyString(), eq("submissions"), anyLong()))
            .thenThrow(new RedisConnectionFailureException("redis down"));

        // 사용량 카운터는 인증/인가가 아니라 어뷰징 억제 장치이므로 장애 시 정상 기능을 막지 않는다.
        assertThat(adapter.tryConsumeDailyQuota(MEMBER_ID)).isTrue();
    }

    private String expectedKey() {
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return "bosspickseoul:test:ai:usage:%d:%s".formatted(MEMBER_ID, today);
    }
}
