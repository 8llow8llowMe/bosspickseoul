package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.store;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.nowdoboss.global.properties.AiReportJobProperties;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiUsageCounterAdapter implements AiUsageCounterPort {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportJobProperties jobProperties;

    @Override
    public void record(Long memberId, AiUsageMeta usage) {
        if (memberId == null || usage == null) {
            return;
        }
        try {
            String key = buildUsageKey(memberId);
            stringRedisTemplate.opsForHash().increment(key, "promptTokens", usage.promptTokens());
            stringRedisTemplate.opsForHash().increment(key, "completionTokens", usage.completionTokens());
            stringRedisTemplate.opsForHash().increment(key, "count", 1L);
            stringRedisTemplate.expire(key, jobProperties.usageTtlSeconds(), TimeUnit.SECONDS);
        } catch (RedisConnectionFailureException exception) {
            log.warn("AI 사용량 집계 저장소에 연결할 수 없어 기록을 건너뜁니다. memberId={} reason={}", memberId, exception.getMessage());
        }
    }

    private String buildUsageKey(Long memberId) {
        String today = LocalDate.now().format(DATE_FORMAT);
        return "%s:ai:usage:%d:%s".formatted(redisProperties.normalizedKeyPrefix(), memberId, today);
    }
}
