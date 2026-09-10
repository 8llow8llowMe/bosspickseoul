package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetActiveReleaseId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.repository.DatasetActiveReleaseRepository;
import com.followfollowme.bosspickseoul.global.properties.DatasetReadProperties;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * 슬롯(dataset, period, spatialVersion, schemaVersion) → 활성 run_id.
 *
 * <p>히트맵처럼 한 요청이 같은 슬롯을 수백 번 묻는 경로가 있어 TTL 캐시를 둔다. 게시는 분기당 한 번이므로 stale 상한
 * (기본 60초)만 명확하면 충분하다. "release 없음" 도 캐시해 레거시 분기에서 매 호출마다 DB 를 묻지 않는다.
 * 캐시는 트랜잭션 밖 인메모리 상태이며 인스턴스마다 따로 산다.
 *
 * <p>알려진 트레이드오프: 한 요청이 같은 슬롯을 여러 번 묻는 동안(히트맵 상권 100개) TTL 이 만료되고 그 사이 게시가 일어나면
 * 앞뒤 상권이 다른 run 을 읽을 수 있다. 구 run 의 행은 지워지지 않으므로 "없는 데이터" 는 아니고, 게시는 분기당 한 번이라
 * 창이 좁다. 요청 단위로 run 을 고정하려면 라우터 호출을 프로세서 진입부로 올려야 하므로 지금은 감수한다.
 * 키는 라우터가 형식 검증한 분기만 오므로 엔트리 수는 데이터셋 15종 × 분기 수로 닫힌다.
 */
@Component
public class DatasetReleaseResolver {

    private final DatasetActiveReleaseRepository datasetActiveReleaseRepository;
    private final DatasetReadProperties properties;
    private final Clock clock;
    private final Map<DatasetActiveReleaseId, CachedRun> cache = new ConcurrentHashMap<>();

    public DatasetReleaseResolver(DatasetActiveReleaseRepository datasetActiveReleaseRepository, DatasetReadProperties properties) {
        this(datasetActiveReleaseRepository, properties, Clock.systemUTC());
    }

    DatasetReleaseResolver(DatasetActiveReleaseRepository datasetActiveReleaseRepository, DatasetReadProperties properties, Clock clock) {
        this.datasetActiveReleaseRepository = datasetActiveReleaseRepository;
        this.properties = properties;
        this.clock = clock;
    }

    /** 설정된 공간·스키마 버전 슬롯에서 해당 데이터셋·분기의 활성 run_id 를 돌려준다. 게시가 없으면 empty. */
    public Optional<String> activeRunId(DatasetKey dataset, String periodCode) {
        DatasetActiveReleaseId slot = new DatasetActiveReleaseId(
            dataset.name(), periodCode, properties.spatialVersion(), properties.schemaVersion());
        Instant now = clock.instant();
        CachedRun cached = cache.get(slot);
        if (cached == null || cached.expiresAt().isBefore(now)) {
            String runId = datasetActiveReleaseRepository.findById(slot)
                .map(DatasetActiveReleaseEntity::getRunId)
                .orElse(null);
            cached = new CachedRun(runId, now.plus(properties.resolverCacheTtl()));
            cache.put(slot, cached);
        }
        return Optional.ofNullable(cached.runId());
    }

    /** 게시 직후 확인 같은 운영 상황에서 캐시를 비운다. */
    public void evictAll() {
        cache.clear();
    }

    private record CachedRun(String runId, Instant expiresAt) {
    }
}
