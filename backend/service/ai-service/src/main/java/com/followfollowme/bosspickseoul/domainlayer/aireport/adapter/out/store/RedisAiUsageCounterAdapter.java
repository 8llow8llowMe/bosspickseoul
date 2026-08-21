package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiUsageCounterPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.bosspickseoul.global.properties.AiReportJobProperties;
import com.followfollowme.bosspickseoul.global.properties.AiReportUsageLimitProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiUsageCounterAdapter implements AiUsageCounterPort {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    // 제출(=LLM 호출 예정) 건수 필드. 완료 건수인 count 와 분리해 둔다 —
    // count 는 워커가 생성에 성공한 뒤 올리므로 실패/타임아웃한 호출이 빠져 상한 기준으로 쓸 수 없다.
    private static final String SUBMISSIONS_FIELD = "submissions";

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportJobProperties jobProperties;
    private final AiReportUsageLimitProperties usageLimitProperties;

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

    /**
     * 기존 일별 usage 해시({@code {prefix}:ai:usage:{memberId}:{yyyy-MM-dd}})를 그대로 재사용하고
     * {@code submissions} 필드만 추가한다. 키가 이미 날짜별로 쪼개져 있고 TTL 관례도 잡혀 있어
     * 별도 저장소나 키 스키마를 새로 만들 이유가 없다.
     *
     * <p><b>Redis 장애 시 정책: fail-open.</b> 사용량 카운터는 어뷰징 억제 장치이지 인증/인가가 아니다.
     * 카운터 저장소 하나가 흔들렸다고 정상 사용자의 리포트 생성을 전부 막는 것은 과하고, 실제 LLM 호출
     * 총량은 워커 큐(스레드 2 / 큐 200, 포화 시 {@code AI_007})가 이미 하드 리밋을 걸고 있다.
     * 대신 상한이 무력화된 구간을 사후에 알 수 있도록 WARN 로그를 남긴다.
     */
    @Override
    public boolean tryConsumeDailyQuota(long memberId) {
        String key = buildUsageKey(memberId);
        try {
            Long submissions = stringRedisTemplate.opsForHash().increment(key, SUBMISSIONS_FIELD, 1L);
            // INCR 결과에만 TTL 을 걸어도 되지만, 키가 여러 필드를 공유하므로 매번 갱신해도
            // 날짜별 키라서 만료 시점이 뒤로 밀리는 문제는 없다 (record() 와 동일 패턴).
            stringRedisTemplate.expire(key, jobProperties.usageTtlSeconds(), TimeUnit.SECONDS);
            if (submissions == null) {
                return true;
            }
            boolean allowed = submissions <= usageLimitProperties.dailyLimit();
            if (!allowed) {
                log.warn("AI 리포트 일별 사용량 상한 초과 memberId={} submissions={} dailyLimit={}",
                    memberId, submissions, usageLimitProperties.dailyLimit());
            }
            return allowed;
        } catch (DataAccessException exception) {
            log.warn("AI 사용량 카운터를 사용할 수 없어 상한 검사를 통과 처리합니다(fail-open). memberId={} reason={}",
                memberId, exception.getMessage());
            return true;
        }
    }

    private String buildUsageKey(Long memberId) {
        String today = LocalDate.now().format(DATE_FORMAT);
        return "%s:ai:usage:%d:%s".formatted(redisProperties.normalizedKeyPrefix(), memberId, today);
    }
}
