package com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.out.store;

import com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception.RankingErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception.RankingException;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.model.AnalysisRankingEntry;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.out.AnalysisRankingStorePort;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.model.AnalysisViewEvent;
import com.followfollowme.bosspickseoul.global.properties.RankingProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.SessionCallback;
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
    // 임시 합산 키는 finally 에서 지우지만, 프로세스 강제 종료나 Redis 순단으로 삭제가 실패하면
    // TTL 이 없을 경우 영구히 남는다. 조회 1회를 넘길 이유가 없는 키라 짧게 건다.
    // 윈도우 버킷 전체를 ZUNIONSTORE 하는 비용을 매 요청마다 치르지 않도록 결과를 짧게 캐시한다.
    // 인기 순위는 실시간성보다 노출 빈도가 중요한 화면(홈 등)에서 쓰인다.
    private static final Duration RANKING_CACHE_TTL = Duration.ofSeconds(20);

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;
    private final RankingProperties rankingProperties;

    @Override
    public void recordView(AnalysisViewEvent event) {
        try {
            String bucketKey = buildBucketKey(event.areaType(), event.occurredAt());
            boolean hasName = event.areaName() != null && !event.areaName().isBlank();
            String nameKey = buildNameMapKey(event.areaType());

            // 이벤트 1건당 최대 4번이던 Redis 왕복을 파이프라인으로 1회로 줄인다.
            // 집계는 조회 트래픽에 비례해 발생하므로 왕복 수가 그대로 부하가 된다.
            stringRedisTemplate.executePipelined(new SessionCallback<Object>() {
                @Override
                @SuppressWarnings("unchecked")
                public <K, V> Object execute(RedisOperations<K, V> operations) {
                    RedisOperations<String, String> ops = (RedisOperations<String, String>) operations;
                    ops.opsForZSet().incrementScore(bucketKey, event.areaCode(), 1.0D);
                    ops.expire(bucketKey, Duration.ofHours(rankingProperties.windowHours() + 2L));
                    if (hasName) {
                        ops.opsForHash().put(nameKey, event.areaCode(), event.areaName());
                        ops.expire(nameKey, NAME_MAP_TTL);
                    }
                    return null;
                }
            });
        } catch (DataAccessException exception) {
            // 집계는 부가 기능 — 저장소 장애 시 이벤트를 버리고 컨슈머 재시도 루프를 만들지 않는다.
            log.warn("인기 순위 집계 반영에 실패해 이벤트를 버립니다. areaType={} areaCode={} reason={}",
                event.areaType(), event.areaCode(), exception.getMessage());
        }
    }

    @Override
    public List<AnalysisRankingEntry> getTopRankings(AnalysisAreaType areaType, int size) {
        String aggregateKey = buildAggregateKey(areaType);

        try {
            // 캐시가 살아 있으면 합산을 건너뛴다. 요청마다 UUID 임시 키를 만들어 지우던 방식은
            // 삭제 실패 시 키가 영구히 남을 수 있어, TTL 이 붙은 고정 키 재사용으로 바꿨다.
            if (!Boolean.TRUE.equals(stringRedisTemplate.hasKey(aggregateKey))) {
                List<String> bucketKeys = buildWindowBucketKeys(areaType, LocalDateTime.now());
                stringRedisTemplate.opsForZSet()
                    .unionAndStore(bucketKeys.get(0), bucketKeys.subList(1, bucketKeys.size()), aggregateKey);
                stringRedisTemplate.expire(aggregateKey, RANKING_CACHE_TTL);
            }

            Set<ZSetOperations.TypedTuple<String>> tuples = stringRedisTemplate.opsForZSet()
                .reverseRangeWithScores(aggregateKey, 0, size - 1L);

            return toEntries(areaType, tuples);
        } catch (DataAccessException exception) {
            throw new RankingException(RankingErrorCode.RANKING_STORE_UNAVAILABLE, exception);
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

        // multiGet 결과는 요청한 키 순서와 1:1 대응한다. 인덱스로 tuples 를 훑으면
        // 두 컬렉션의 순서가 같다는 가정에 기대게 되므로, code -> name 맵으로 명시 매핑한다.
        Map<String, String> nameByAreaCode = new HashMap<>();
        for (int index = 0; index < areaCodes.size(); index++) {
            Object areaName = (areaNames != null && index < areaNames.size()) ? areaNames.get(index) : null;
            if (areaName != null) {
                nameByAreaCode.put(areaCodes.get(index), areaName.toString());
            }
        }

        List<AnalysisRankingEntry> entries = new ArrayList<>(tuples.size());
        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            entries.add(new AnalysisRankingEntry(
                tuple.getValue(),
                nameByAreaCode.get(tuple.getValue()),
                tuple.getScore() != null ? tuple.getScore().longValue() : 0L
            ));
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
        return "%s:ranking:analysis:agg:%s".formatted(redisProperties.normalizedKeyPrefix(), areaType.name());
    }
}
