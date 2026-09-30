package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetStagingPurgeProcessor;
import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** MySQL 전용 DELETE ... LIMIT 이라 H2 로 돌리지 않고 문장과 반복 조건을 대조한다. */
class DatasetStagingPurgeJdbcAdapterTest {

    private static final Instant CUTOFF = Instant.parse("2026-09-20T00:00:00Z");

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final DatasetStagingPurgeJdbcAdapter adapter = new DatasetStagingPurgeJdbcAdapter(jdbc);

    @Test
    void everyStatementOnlyTouchesStagingTablesAndExcludesActiveReleases() {
        for (String sql : List.of(DatasetStagingPurgeJdbcAdapter.UNPUBLISHED_STAGING_SQL,
            DatasetStagingPurgeJdbcAdapter.UNPUBLISHED_REJECTED_SQL, DatasetStagingPurgeJdbcAdapter.SUPERSEDED_STAGING_SQL)) {
            assertThat(sql).matches("DELETE FROM (dataset_staging|dataset_rejected_row) WHERE run_id IN \\(.*\\) LIMIT \\?")
                .contains("NOT IN (SELECT a.run_id FROM dataset_active_release a WHERE a.run_id IS NOT NULL)")
                .doesNotContain("dataset_fact").doesNotContain("DELETE FROM dataset_release");
        }
        assertThat(DatasetStagingPurgeJdbcAdapter.UNPUBLISHED_STAGING_SQL).contains("r.status IN ('DRY_RUN','FAILED')").contains("r.acquired_at < ?");
        assertThat(DatasetStagingPurgeJdbcAdapter.SUPERSEDED_STAGING_SQL).contains("r.status='PUBLISHED'").contains("r.published_at < ?");
    }

    @Test
    void deletesInChunksUntilAChunkComesBackShort() {
        when(jdbc.update(DatasetStagingPurgeJdbcAdapter.UNPUBLISHED_STAGING_SQL, Timestamp.from(CUTOFF), 1000)).thenReturn(1000, 1000, 17);

        long deleted = adapter.deleteUnpublishedStaging(CUTOFF, 1000);

        assertThat(deleted).isEqualTo(2017);
        verify(jdbc, times(3)).update(DatasetStagingPurgeJdbcAdapter.UNPUBLISHED_STAGING_SQL, Timestamp.from(CUTOFF), 1000);
    }

    @Test
    void processorDerivesCutoffsFromTheRetentionDays() {
        var port = mock(com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetStagingPurgePort.class);
        Instant now = Instant.parse("2026-10-04T19:00:00Z");
        when(port.deleteUnpublishedStaging(Instant.parse("2026-09-27T19:00:00Z"), 5000)).thenReturn(10L);
        when(port.deleteUnpublishedRejectedRows(Instant.parse("2026-09-27T19:00:00Z"), 5000)).thenReturn(2L);
        when(port.deleteSupersededPublishedStaging(Instant.parse("2026-09-04T19:00:00Z"), 5000)).thenReturn(3L);
        DatasetStagingPurgeProcessor processor = new DatasetStagingPurgeProcessor(port,
            new DatasetStagingPurgeProperties(true, null, 30, 7, 5000), Clock.fixed(now, ZoneOffset.UTC));

        StagingPurgeResult result = processor.purge();

        assertThat(result).isEqualTo(new StagingPurgeResult(10, 2, 3));
        verify(port).deleteSupersededPublishedStaging(eq(Instant.parse("2026-09-04T19:00:00Z")), eq(5000));
    }

    @Test
    void propertiesDefaultToAWeeklyOffSchedule() {
        DatasetStagingPurgeProperties properties = new DatasetStagingPurgeProperties(false, " ", 0, 0, 0);

        assertThat(properties.cron()).isEqualTo("0 0 4 ? * SUN");
        assertThat(properties.publishedRetentionDays()).isEqualTo(30);
        assertThat(properties.unpublishedRetentionDays()).isEqualTo(7);
        assertThat(properties.chunkSize()).isEqualTo(5000);
    }
}
