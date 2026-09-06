package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportJobStorePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiReportJobStoreAdapter implements AiReportJobStorePort {

    private static final DefaultRedisScript<String> RESERVE_OR_GET_SCRIPT = new DefaultRedisScript<>("""
        local existing = redis.call('GET', KEYS[1])
        if existing then
            return existing
        end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
        return ARGV[1]
        """, String.class);

    private static final DefaultRedisScript<Long> SAVE_IF_STATUS_SCRIPT = new DefaultRedisScript<>("""
        local current = redis.call('GET', KEYS[1])
        if not current then
            return 0
        end
        local job = cjson.decode(current)
        if job.status ~= ARGV[1] then
            return 0
        end
        redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
        return 1
        """, Long.class);

    private static final DefaultRedisScript<Long> RELEASE_IF_OWNER_SCRIPT = new DefaultRedisScript<>("""
        if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('DEL', KEYS[1])
        end
        return 0
        """, Long.class);

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
        } catch (DataAccessException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public String reserveOrGetExistingJobId(Long memberId, String requestHash, String newJobId) {
        try {
            String key = buildIdempotencyKey(memberId, requestHash);
            String ownerJobId = stringRedisTemplate.execute(
                RESERVE_OR_GET_SCRIPT, List.of(key), newJobId, Long.toString(jobProperties.ttlSeconds())
            );
            if (ownerJobId == null) {
                throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE);
            }
            return ownerJobId;
        } catch (DataAccessException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public void releaseIdempotencyKey(Long memberId, String requestHash, String expectedJobId) {
        try {
            stringRedisTemplate.execute(
                RELEASE_IF_OWNER_SCRIPT, List.of(buildIdempotencyKey(memberId, requestHash)), expectedJobId
            );
        } catch (DataAccessException exception) {
            log.warn("AI 리포트 중복 방지 키 해제를 건너뜁니다. memberId={} hash={} jobId={} reason={}",
                memberId, requestHash, expectedJobId, exception.getMessage());
        }
    }

    @Override
    public AiReportJob save(AiReportJob job) {
        try {
            stringRedisTemplate.opsForValue().set(
                buildJobKey(job.jobId()), objectMapper.writeValueAsString(job), Duration.ofSeconds(jobProperties.ttlSeconds())
            );
            return job;
        } catch (JsonProcessingException | DataAccessException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public boolean saveIfStatus(AiReportJob job, AiReportJobStatus expectedStatus) {
        try {
            String json = objectMapper.writeValueAsString(job);
            Long saved = stringRedisTemplate.execute(
                SAVE_IF_STATUS_SCRIPT,
                List.of(buildJobKey(job.jobId())),
                expectedStatus.name(), json, Long.toString(jobProperties.ttlSeconds())
            );
            if (saved == null) {
                throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE);
            }
            return Long.valueOf(1L).equals(saved);
        } catch (JsonProcessingException | DataAccessException exception) {
            throw new AiReportException(AiReportErrorCode.JOB_STORE_UNAVAILABLE, exception);
        }
    }

    @Override
    public void deleteJob(String jobId) {
        try {
            stringRedisTemplate.delete(buildJobKey(jobId));
        } catch (DataAccessException exception) {
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
