package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetStagingPurgePort;
import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 보존 기간으로 기준 시각을 정하고 세 종류를 차례로 지운다. */
@Component
@RequiredArgsConstructor
public class DatasetStagingPurgeProcessor {

    private final DatasetStagingPurgePort purges;
    private final DatasetStagingPurgeProperties properties;
    private final Clock clock;

    public StagingPurgeResult purge() {
        Instant now = clock.instant();
        Instant unpublishedBefore = now.minus(Duration.ofDays(properties.unpublishedRetentionDays()));
        Instant publishedBefore = now.minus(Duration.ofDays(properties.publishedRetentionDays()));
        int chunk = properties.chunkSize();
        return new StagingPurgeResult(
            purges.deleteUnpublishedStaging(unpublishedBefore, chunk),
            purges.deleteUnpublishedRejectedRows(unpublishedBefore, chunk),
            purges.deleteSupersededPublishedStaging(publishedBefore, chunk));
    }
}
