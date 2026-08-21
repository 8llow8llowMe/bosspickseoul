package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiReportJobStoreAdapter implements AiReportJobStorePort {

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportJobProperties jobProperties;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<AiReportJob> findById(String jobId) {
        try {
            String json = stringRedisTemplate.opsForValue().get(buildJobKey(jobId));
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, AiReportJob.class));
        } catch (JsonProcessingException exception) {
            log.warn("AI 리포트 잡 데이터를 해석할 수 없어 없는 것으로 처리합니다. jobId={} reason={}", jobId, exception.getMessage());
            return Optional.empty();
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public Optional<String> reserveOrGetExistingJobId(Long memberId, String requestHash, String newJobId) {
        try {
            String key = buildIdempotencyKey(memberId, requestHash);
            Boolean reserved = stringRedisTemplate.opsForValue().setIfAbsent(
                key, newJobId, Duration.ofSeconds(jobProperties.ttlSeconds())
            );
            if (Boolean.TRUE.equals(reserved)) {
                return Optional.empty();
            }
            return Optional.ofNullable(stringRedisTemplate.opsForValue().get(key));
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public void releaseIdempotencyKey(Long memberId, String requestHash) {
        try {
            stringRedisTemplate.delete(buildIdempotencyKey(memberId, requestHash));
        } catch (RedisConnectionFailureException exception) {
            log.warn("AI 리포트 중복 방지 키 해제를 건너뜁니다. memberId={} hash={} reason={}", memberId, requestHash, exception.getMessage());
        }
    }

    @Override
    public AiReportJob save(AiReportJob job) {
        try {
            stringRedisTemplate.opsForValue().set(
                buildJobKey(job.jobId()), objectMapper.writeValueAsString(job), Duration.ofSeconds(jobProperties.ttlSeconds())
            );
            return job;
        } catch (JsonProcessingException | RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public void deleteJob(String jobId) {
        try {
            stringRedisTemplate.delete(buildJobKey(jobId));
        } catch (RedisConnectionFailureException exception) {
            log.warn("AI 리포트 잡 삭제를 건너뜁니다. jobId={} reason={}", jobId, exception.getMessage());
        }
    }

    private String buildJobKey(String jobId) {
        return "%s:ai:job:%s".formatted(redisProperties.normalizedKeyPrefix(), jobId);
    }

    private String buildIdempotencyKey(Long memberId, String requestHash) {
        return "%s:ai:job:idempotency:%d:%s".formatted(redisProperties.normalizedKeyPrefix(), memberId, requestHash);
    }
}
