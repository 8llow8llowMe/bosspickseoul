package com.followfollowme.nowdoboss.domainlayer.ranking.adapter.out.store;

import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingErrorCode;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingException;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.model.AnalysisRankingEntry;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.nowdoboss.domainlayer.ranking.domain.model.AnalysisViewEvent;
import com.followfollowme.nowdoboss.global.properties.RankingProperties;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Component;

/**
 * Redis Sorted Set 기반 실시간 인기 순위 집계 어댑터.
 *
 * <p>키 구조 (시간 버킷 방식 — "최근 N시간" 슬라이딩 윈도우):
 * <ul>
 *   <li>버킷: {prefix}:ranking:analysis:{AREA_TYPE}:{yyyyMMddHH} — ZINCRBY, TTL = windowHours + 2h</li>
 *   <li>이름 맵: {prefix}:ranking:analysis:name:{AREA_TYPE} — HSET areaCode -> areaName (이벤트에 이름이 있을 때만)</li>
 *   <li>조회: 윈도우 내 버킷들을 ZUNIONSTORE 로 임시 키에 합산 후 ZREVRANGE, 임시 키 즉시 삭제</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisRankingRedisAdapter implements AnalysisRankingStorePort {

    private static final DateTimeFormatter BUCKET_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHH");
    private static final Duration NAME_MAP_TTL = Duration.ofDays(7);

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;
    private final RankingProperties rankingProperties;

    @Override
    public void recordView(AnalysisViewEvent event) {
        try {
            String bucketKey = buildBucketKey(event.areaType(), event.occurredAt());
            stringRedisTemplate.opsForZSet().incrementScore(bucketKey, event.areaCode(), 1.0D);
            stringRedisTemplate.expire(bucketKey, Duration.ofHours(rankingProperties.windowHours() + 2L));

            if (event.areaName() != null && !event.areaName().isBlank()) {
                String nameKey = buildNameMapKey(event.areaType());
                stringRedisTemplate.opsForHash().put(nameKey, event.areaCode(), event.areaName());
                stringRedisTemplate.expire(nameKey, NAME_MAP_TTL);
            }
        } catch (DataAccessException exception) {
            // 집계는 부가 기능 — 저장소 장애 시 이벤트를 버리고 컨슈머 재시도 루프를 만들지 않는다.
            log.warn("인기 순위 집계 반영에 실패해 이벤트를 버립니다. areaType={} areaCode={} reason={}",
                event.areaType(), event.areaCode(), exception.getMessage());
        }
    }

    @Override
    public List<AnalysisRankingEntry> getTopRankings(AnalysisAreaType areaType, int size) {
        List<String> bucketKeys = buildWindowBucketKeys(areaType, LocalDateTime.now());
        String aggregateKey = buildAggregateKey(areaType);

        try {
            stringRedisTemplate.opsForZSet()
                .unionAndStore(bucketKeys.get(0), bucketKeys.subList(1, bucketKeys.size()), aggregateKey);

            Set<ZSetOperations.TypedTuple<String>> tuples = stringRedisTemplate.opsForZSet()
                .reverseRangeWithScores(aggregateKey, 0, size - 1L);

            return toEntries(areaType, tuples);
        } catch (DataAccessException exception) {
            throw new RankingException(RankingErrorCode.RANKING_STORE_UNAVAILABLE, exception);
        } finally {
            try {
                stringRedisTemplate.delete(aggregateKey);
            } catch (DataAccessException ignored) {
                // 임시 키 삭제 실패는 무시 (다음 조회에서 새 키를 쓴다)
            }
        }
    }

    private List<AnalysisRankingEntry> toEntries(AnalysisAreaType areaType, Set<ZSetOperations.TypedTuple<String>> tuples) {
        if (tuples == null || tuples.isEmpty()) {
            return List.of();
        }

        List<String> areaCodes = new ArrayList<>(new LinkedHashSet<>(
            tuples.stream().map(ZSetOperations.TypedTuple::getValue).toList()
        ));
        List<Object> hashKeys = new ArrayList<>(areaCodes);
        List<Object> areaNames = stringRedisTemplate.opsForHash().multiGet(buildNameMapKey(areaType), hashKeys);

        List<AnalysisRankingEntry> entries = new ArrayList<>(tuples.size());
        int index = 0;
        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            Object areaName = (areaNames != null && index < areaNames.size()) ? areaNames.get(index) : null;
            entries.add(new AnalysisRankingEntry(
                tuple.getValue(),
                areaName != null ? areaName.toString() : null,
                tuple.getScore() != null ? tuple.getScore().longValue() : 0L
            ));
            index++;
        }
        return entries;
    }

    private List<String> buildWindowBucketKeys(AnalysisAreaType areaType, LocalDateTime baseTime) {
        List<String> keys = new ArrayList<>(rankingProperties.windowHours());
        for (int hour = 0; hour < rankingProperties.windowHours(); hour++) {
            keys.add(buildBucketKey(areaType, baseTime.minusHours(hour)));
        }
        return keys;
    }

    private String buildBucketKey(AnalysisAreaType areaType, LocalDateTime occurredAt) {
        LocalDateTime bucketTime = (occurredAt != null) ? occurredAt : LocalDateTime.now();
        return "%s:ranking:analysis:%s:%s"
            .formatted(redisProperties.normalizedKeyPrefix(), areaType.name(), BUCKET_FORMATTER.format(bucketTime));
    }

    private String buildNameMapKey(AnalysisAreaType areaType) {
        return "%s:ranking:analysis:name:%s".formatted(redisProperties.normalizedKeyPrefix(), areaType.name());
    }

    private String buildAggregateKey(AnalysisAreaType areaType) {
        return "%s:ranking:analysis:agg:%s:%s"
            .formatted(redisProperties.normalizedKeyPrefix(), areaType.name(), UUID.randomUUID());
    }
}
