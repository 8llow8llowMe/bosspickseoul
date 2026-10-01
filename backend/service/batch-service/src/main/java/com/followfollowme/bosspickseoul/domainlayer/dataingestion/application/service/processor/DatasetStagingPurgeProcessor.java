package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetStagingBulkPort;
import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 보존 기간으로 기준 시각을 정하고, 후보 run 을 한 번에 고른 뒤 run 마다 지운다.
 *
 * <p>run 단위 루프는 N+1 이 아니라 원천 단위다. 한 문장으로 여러 run 을 지우면({@code run_id IN (subquery) LIMIT ?}) PK 범위를
 * 쓰지 못해 {@code dataset_staging} 전체를 훑고 잠근다. run 하나씩 PK 선두 범위로 지워야 05:00 적재와 락이 겹치지 않는다.
 * 한 run 이 락 대기 초과·데드락에 걸리면 그 run 만 건너뛰고 다음 run 으로 간다(다음 주에 다시 고른다).
 */
@Component
@RequiredArgsConstructor
public class DatasetStagingPurgeProcessor {

    private static final Logger log = LoggerFactory.getLogger(DatasetStagingPurgeProcessor.class);

    static final String ABANDONED_REASON = "abandoned: still NEW/RUNNING after batch.staging-purge.abandoned-after-days; marked by staging purge";

    private final DatasetStagingBulkPort staging;
    private final DatasetStagingPurgeProperties properties;
    private final Clock clock;

    public StagingPurgeResult purge() {
        Instant now = clock.instant();
        Instant unpublishedBefore = now.minus(Duration.ofDays(properties.unpublishedRetentionDays()));
        Instant publishedBefore = now.minus(Duration.ofDays(properties.publishedRetentionDays()));
        Instant abandonedBefore = now.minus(Duration.ofDays(properties.abandonedAfterDays()));
        int chunk = properties.chunkSize();
        List<StagingPurgeCandidate> candidates = staging.findPurgeCandidates(unpublishedBefore, publishedBefore, abandonedBefore);
        int abandoned = 0;
        int skipped = 0;
        int lockConflicts = 0;
        long unpublishedStaging = 0;
        long unpublishedRejected = 0;
        long supersededStaging = 0;
        for (StagingPurgeCandidate candidate : candidates) {
            try {
                switch (candidate.kind()) {
                    case ABANDONED -> {
                        // 먼저 FAILED 로 표시한다. 그 사이 끝났거나 다시 시작했으면 조건이 안 맞아 표시되지 않고, 그 run 은 지우지 않는다.
                        if (!staging.markAbandoned(candidate.runId(), abandonedBefore, ABANDONED_REASON)) {
                            skipped++;
                            continue;
                        }
                        abandoned++;
                        unpublishedStaging += staging.deleteStaging(candidate, abandonedBefore, chunk);
                        unpublishedRejected += staging.deleteRejectedRows(candidate, abandonedBefore, chunk);
                    }
                    case UNPUBLISHED -> {
                        unpublishedStaging += staging.deleteStaging(candidate, unpublishedBefore, chunk);
                        unpublishedRejected += staging.deleteRejectedRows(candidate, unpublishedBefore, chunk);
                    }
                    case SUPERSEDED -> supersededStaging += staging.deleteStaging(candidate, publishedBefore, chunk);
                }
            } catch (DatasetStagingBulkPort.LockConflict conflict) {
                // 그때까지 지운 청크는 커밋돼 있지만 행 수에는 넣지 않는다. 남은 행은 다음 주 run 이 다시 고른다.
                lockConflicts++;
                log.warn("[staging-purge] lock conflict, run skipped runId={} kind={}", candidate.runId(), candidate.kind());
            }
        }
        return new StagingPurgeResult(candidates.size(), abandoned, skipped, lockConflicts, unpublishedStaging, unpublishedRejected,
            supersededStaging);
    }
}
