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
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiUsageCounterAdapter implements AiUsageCounterPort {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportJobProperties jobProperties;

    @Override
    public void record(Long userId, AiUsageMeta usage) {
        if (userId == null || usage == null) {
            return;
        }
        try {
            String key = buildUsageKey(userId);
            redisTemplate.opsForHash().increment(key, "promptTokens", usage.promptTokens());
            redisTemplate.opsForHash().increment(key, "completionTokens", usage.completionTokens());
            redisTemplate.opsForHash().increment(key, "count", 1L);
            redisTemplate.expire(key, jobProperties.usageTtlSeconds(), TimeUnit.SECONDS);
        } catch (RedisConnectionFailureException exception) {
            log.warn("AI usage counter unavailable userId={} error={}", userId, exception.getMessage());
        }
    }

    private String buildUsageKey(Long userId) {
        String today = LocalDate.now().format(DATE_FORMAT);
        return "%s:ai:usage:%d:%s".formatted(redisProperties.normalizedKeyPrefix(), userId, today);
    }
}
