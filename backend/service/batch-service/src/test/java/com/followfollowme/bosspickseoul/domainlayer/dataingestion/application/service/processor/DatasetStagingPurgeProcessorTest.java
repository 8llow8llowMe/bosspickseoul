package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate.Kind;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetStagingBulkPort;
import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class DatasetStagingPurgeProcessorTest {

    private static final Instant NOW = Instant.parse("2026-10-04T19:00:00Z");
    private static final Instant UNPUBLISHED_BEFORE = Instant.parse("2026-09-27T19:00:00Z");
    private static final Instant PUBLISHED_BEFORE = Instant.parse("2026-09-04T19:00:00Z");
    private static final Instant ABANDONED_BEFORE = Instant.parse("2026-10-02T19:00:00Z");

    private final DatasetStagingBulkPort staging = mock(DatasetStagingBulkPort.class);
    private final DatasetStagingPurgeProcessor processor = new DatasetStagingPurgeProcessor(staging,
        new DatasetStagingPurgeProperties(true, null, 30, 7, 5000, 2), Clock.fixed(NOW, ZoneOffset.UTC));

    /** 삭제 문장이 보존 기간을 다시 확인하도록, 그 run 을 고른 기준 시각을 함께 넘긴다. */
    @Test
    void cutoffsComeFromTheRetentionDaysAndEachKindDeletesItsTables() {
        StagingPurgeCandidate dry = new StagingPurgeCandidate("dry", Kind.UNPUBLISHED);
        StagingPurgeCandidate old = new StagingPurgeCandidate("old", Kind.SUPERSEDED);
        when(staging.findPurgeCandidates(UNPUBLISHED_BEFORE, PUBLISHED_BEFORE, ABANDONED_BEFORE)).thenReturn(List.of(dry, old));
        when(staging.deleteStaging(dry, UNPUBLISHED_BEFORE, 5000)).thenReturn(10L);
        when(staging.deleteRejectedRows(dry, UNPUBLISHED_BEFORE, 5000)).thenReturn(2L);
        when(staging.deleteStaging(old, PUBLISHED_BEFORE, 5000)).thenReturn(3L);

        StagingPurgeResult result = processor.purge();

        assertThat(result).isEqualTo(new StagingPurgeResult(2, 0, 0, 0, 10, 2, 3));
        verify(staging, never()).deleteRejectedRows(old, PUBLISHED_BEFORE, 5000);
        verify(staging, never()).markAbandoned(any(), any(), any());
    }

    /** 버려진 run 은 FAILED 로 먼저 표시하고 나서 지운다. 표시가 안 되면(그 사이 끝났거나 재시작) 손대지 않는다. */
    @Test
    void abandonedRunsAreMarkedFailedBeforeTheirRowsAreDeleted() {
        StagingPurgeCandidate stuck = new StagingPurgeCandidate("stuck", Kind.ABANDONED);
        StagingPurgeCandidate revived = new StagingPurgeCandidate("revived", Kind.ABANDONED);
        when(staging.findPurgeCandidates(UNPUBLISHED_BEFORE, PUBLISHED_BEFORE, ABANDONED_BEFORE)).thenReturn(List.of(stuck, revived));
        when(staging.markAbandoned("stuck", ABANDONED_BEFORE, DatasetStagingPurgeProcessor.ABANDONED_REASON)).thenReturn(true);
        when(staging.markAbandoned("revived", ABANDONED_BEFORE, DatasetStagingPurgeProcessor.ABANDONED_REASON)).thenReturn(false);
        when(staging.deleteStaging(stuck, ABANDONED_BEFORE, 5000)).thenReturn(7L);
        when(staging.deleteRejectedRows(stuck, ABANDONED_BEFORE, 5000)).thenReturn(1L);

        StagingPurgeResult result = processor.purge();

        InOrder order = inOrder(staging);
        order.verify(staging).markAbandoned("stuck", ABANDONED_BEFORE, DatasetStagingPurgeProcessor.ABANDONED_REASON);
        order.verify(staging).deleteStaging(stuck, ABANDONED_BEFORE, 5000);
        order.verify(staging).deleteRejectedRows(stuck, ABANDONED_BEFORE, 5000);
        verify(staging, never()).deleteStaging(revived, ABANDONED_BEFORE, 5000);
        verify(staging, never()).deleteRejectedRows(revived, ABANDONED_BEFORE, 5000);
        assertThat(result).isEqualTo(new StagingPurgeResult(2, 1, 1, 0, 7, 1, 0));
    }

    /** 락 대기 초과·데드락에 걸린 run 은 건너뛰고 다음 run 을 계속 정리한다. 남은 행은 다음 주에 다시 고른다. */
    @Test
    void lockConflictSkipsOnlyThatRun() {
        StagingPurgeCandidate busy = new StagingPurgeCandidate("busy", Kind.UNPUBLISHED);
        StagingPurgeCandidate next = new StagingPurgeCandidate("next", Kind.UNPUBLISHED);
        when(staging.findPurgeCandidates(UNPUBLISHED_BEFORE, PUBLISHED_BEFORE, ABANDONED_BEFORE)).thenReturn(List.of(busy, next));
        when(staging.deleteStaging(busy, UNPUBLISHED_BEFORE, 5000)).thenThrow(new DatasetStagingBulkPort.LockConflict("busy", null));
        when(staging.deleteStaging(next, UNPUBLISHED_BEFORE, 5000)).thenReturn(4L);
        when(staging.deleteRejectedRows(next, UNPUBLISHED_BEFORE, 5000)).thenReturn(1L);

        StagingPurgeResult result = processor.purge();

        assertThat(result).isEqualTo(new StagingPurgeResult(2, 0, 0, 1, 4, 1, 0));
        verify(staging, never()).deleteRejectedRows(busy, UNPUBLISHED_BEFORE, 5000);
    }

    @Test
    void propertiesDefaultToAWeeklyOffSchedule() {
        DatasetStagingPurgeProperties properties = new DatasetStagingPurgeProperties(false, " ", 0, 0, 0, 0);

        assertThat(properties.cron()).isEqualTo("0 0 4 ? * SUN");
        assertThat(properties.publishedRetentionDays()).isEqualTo(30);
        assertThat(properties.unpublishedRetentionDays()).isEqualTo(7);
        assertThat(properties.chunkSize()).isEqualTo(5000);
        assertThat(properties.abandonedAfterDays()).isEqualTo(2);
        assertThatThrownBy(() -> new DatasetStagingPurgeProperties(false, null, 30, 7, 5000, -1)).hasMessageContaining("retention days");
    }
}
