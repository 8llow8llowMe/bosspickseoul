package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.nowdoboss.global.properties.AiReportJobProperties;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiReportJobStoreAdapter implements AiReportJobStorePort {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportJobProperties jobProperties;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<AiReportJob> findById(String jobId) {
        try {
            Object value = redisTemplate.opsForValue().get(buildJobKey(jobId));
            if (value == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.convertValue(value, AiReportJob.class));
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public Optional<String> reserveOrGetExistingJobId(Long userId, String requestHash, String newJobId) {
        try {
            String key = buildIdempotencyKey(userId, requestHash);
            Boolean reserved = redisTemplate.opsForValue().setIfAbsent(
                key, newJobId, Duration.ofSeconds(jobProperties.ttlSeconds())
            );
            if (Boolean.TRUE.equals(reserved)) {
                return Optional.empty();
            }
            Object existing = redisTemplate.opsForValue().get(key);
            return existing == null ? Optional.empty() : Optional.of(existing.toString());
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public void releaseIdempotencyKey(Long userId, String requestHash) {
        try {
            redisTemplate.delete(buildIdempotencyKey(userId, requestHash));
        } catch (RedisConnectionFailureException exception) {
            log.warn("AI report idempotency release skipped userId={} hash={} reason={}", userId, requestHash, exception.getMessage());
        }
    }

    @Override
    public AiReportJob save(AiReportJob job) {
        try {
            redisTemplate.opsForValue().set(
                buildJobKey(job.jobId()), job, Duration.ofSeconds(jobProperties.ttlSeconds())
            );
            return job;
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public void deleteJob(String jobId) {
        try {
            redisTemplate.delete(buildJobKey(jobId));
        } catch (RedisConnectionFailureException exception) {
            log.warn("AI report job delete skipped jobId={} reason={}", jobId, exception.getMessage());
        }
    }

    private String buildJobKey(String jobId) {
        return "%s:ai:job:%s".formatted(redisProperties.normalizedKeyPrefix(), jobId);
    }

    private String buildIdempotencyKey(Long userId, String requestHash) {
        return "%s:ai:job:idempotency:%d:%s".formatted(redisProperties.normalizedKeyPrefix(), userId, requestHash);
    }
}
