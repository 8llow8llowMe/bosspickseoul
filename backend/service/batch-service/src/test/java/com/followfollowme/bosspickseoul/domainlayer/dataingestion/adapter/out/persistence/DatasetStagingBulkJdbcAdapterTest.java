package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate.Kind;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

/**
 * MySQL 전용 DELETE ... LIMIT 이라 H2 로 돌리지 않고 문장·바인딩·반복 조건을 대조한다. 실행 계획은 켜기 전에 개발 DB 에서
 * EXPLAIN 으로 본다(batch-service.md 「스테이징 정리」).
 */
class DatasetStagingBulkJdbcAdapterTest {

    private static final Instant UNPUBLISHED = Instant.parse("2026-09-27T19:00:00Z");
    private static final Instant PUBLISHED = Instant.parse("2026-09-04T19:00:00Z");
    private static final Instant ABANDONED = Instant.parse("2026-10-02T19:00:00Z");

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final DatasetStagingBulkJdbcAdapter adapter = new DatasetStagingBulkJdbcAdapter(jdbc);

    /** 후보는 잠금 없는 일반 SELECT 로 고른다. 활성 포인터가 가리키는 run 은 조인으로 뺀다. */
    @Test
    void candidatesComeFromALockFreeSelectThatExcludesActiveReleases() {
        String sql = DatasetStagingBulkJdbcAdapter.CANDIDATES_SQL;

        assertThat(sql).startsWith("SELECT r.run_id, r.status")
            .contains("LEFT JOIN dataset_active_release a ON a.run_id = r.run_id")
            .contains("WHERE a.run_id IS NULL")
            .contains("(r.status IN ('DRY_RUN','FAILED') AND r.acquired_at < ?)")
            .contains("(r.status = 'PUBLISHED' AND r.published_at < ?)")
            .contains("(r.status IN ('NEW','RUNNING') AND r.acquired_at < ?)")
            .doesNotContain("FOR UPDATE").doesNotContain("LOCK IN SHARE MODE");
    }

    @Test
    void candidatesBindTheThreeCutoffsInOrderAndMapStatusesToKinds() throws Exception {
        List<StagingPurgeCandidate> mapped = new ArrayList<>();
        when(jdbc.query(eq(DatasetStagingBulkJdbcAdapter.CANDIDATES_SQL), any(RowMapper.class), any(), any(), any())).thenAnswer(invocation -> {
            RowMapper<StagingPurgeCandidate> mapper = invocation.getArgument(1);
            for (String[] row : new String[][] {{"a", "DRY_RUN"}, {"b", "FAILED"}, {"c", "PUBLISHED"}, {"d", "NEW"}, {"e", "RUNNING"}}) {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getString("run_id")).thenReturn(row[0]);
                when(rs.getString("status")).thenReturn(row[1]);
                mapped.add(mapper.mapRow(rs, 0));
            }
            return mapped;
        });

        List<StagingPurgeCandidate> candidates = adapter.findPurgeCandidates(UNPUBLISHED, PUBLISHED, ABANDONED);

        verify(jdbc).query(eq(DatasetStagingBulkJdbcAdapter.CANDIDATES_SQL), any(RowMapper.class),
            eq(Timestamp.from(UNPUBLISHED)), eq(Timestamp.from(PUBLISHED)), eq(Timestamp.from(ABANDONED)));
        assertThat(candidates).extracting(StagingPurgeCandidate::kind)
            .containsExactly(Kind.UNPUBLISHED, Kind.UNPUBLISHED, Kind.SUPERSEDED, Kind.ABANDONED, Kind.ABANDONED);
    }

    /**
     * run 하나의 PK 선두 범위만 지운다. 예전 {@code run_id IN (SELECT ...) LIMIT ?} 는 semijoin 이 안 돼 테이블 전체를 훑고 잠갔다.
     * 문장마다 그 run 이 아직 대상 상태이고 활성 포인터가 가리키지 않는지 다시 본다.
     */
    @Test
    void deletesAreScopedToOneRunAndRecheckStatusAndActivePointer() {
        for (String sql : List.of(DatasetStagingBulkJdbcAdapter.DELETE_STAGING_SQL, DatasetStagingBulkJdbcAdapter.DELETE_REJECTED_SQL)) {
            String flat = sql.replaceAll("\\s+", " ").trim();
            assertThat(flat).matches("DELETE FROM (dataset_staging|dataset_rejected_row) WHERE run_id = \\? AND .* LIMIT \\?")
                .contains("EXISTS (SELECT 1 FROM dataset_release r WHERE r.run_id = ? AND r.status IN (?, ?))")
                .contains("NOT EXISTS (SELECT 1 FROM dataset_active_release a WHERE a.run_id = ?)")
                .doesNotContain("run_id IN (")
                .doesNotContain("dataset_fact")
                .doesNotContain("DELETE FROM dataset_release");
        }
    }

    @Test
    void deletesInChunksUntilAChunkComesBackShort() {
        StagingPurgeCandidate candidate = new StagingPurgeCandidate("auto-sales-commercial-20262-202609300500-dry", Kind.UNPUBLISHED);
        String runId = candidate.runId();
        when(jdbc.update(DatasetStagingBulkJdbcAdapter.DELETE_STAGING_SQL, runId, runId, "DRY_RUN", "FAILED", runId, 1000))
            .thenReturn(1000, 1000, 17);

        long deleted = adapter.deleteStaging(candidate, 1000);

        assertThat(deleted).isEqualTo(2017);
        verify(jdbc, times(3)).update(DatasetStagingBulkJdbcAdapter.DELETE_STAGING_SQL, runId, runId, "DRY_RUN", "FAILED", runId, 1000);
    }

    @Test
    void eachKindRechecksTheStatusItWasChosenFor() {
        assertThat(DatasetStagingBulkJdbcAdapter.expectedStatuses(Kind.UNPUBLISHED)).containsExactly("DRY_RUN", "FAILED");
        assertThat(DatasetStagingBulkJdbcAdapter.expectedStatuses(Kind.SUPERSEDED)).containsExactly("PUBLISHED", "PUBLISHED");
        assertThat(DatasetStagingBulkJdbcAdapter.expectedStatuses(Kind.ABANDONED)).as("버려진 run 은 FAILED 로 표시한 뒤 지운다")
            .containsExactly("FAILED", "FAILED");

        StagingPurgeCandidate abandoned = new StagingPurgeCandidate("run-x", Kind.ABANDONED);
        adapter.deleteRejectedRows(abandoned, 500);
        verify(jdbc).update(DatasetStagingBulkJdbcAdapter.DELETE_REJECTED_SQL, "run-x", "run-x", "FAILED", "FAILED", "run-x", 500);
    }

    /** 버려진 run 표시는 PK 한 행만 바꾸고, 그 사이 끝났거나 다시 시작했으면(상태·시작 시각 조건) 바꾸지 않는다. */
    @Test
    void markingAnAbandonedRunGuardsOnStatusAndStartTime() {
        assertThat(DatasetStagingBulkJdbcAdapter.MARK_ABANDONED_SQL.replaceAll("\\s+", " ").trim())
            .isEqualTo("UPDATE dataset_release SET status='FAILED', failure_reason=? WHERE run_id=? AND status IN ('NEW','RUNNING') AND acquired_at < ?");
        when(jdbc.update(eq(DatasetStagingBulkJdbcAdapter.MARK_ABANDONED_SQL), anyString(), eq("run-x"), eq(Timestamp.from(ABANDONED))))
            .thenReturn(1, 0);

        assertThat(adapter.markAbandoned("run-x", ABANDONED, "x".repeat(600))).isTrue();
        assertThat(adapter.markAbandoned("run-x", ABANDONED, "abandoned")).isFalse();
        verify(jdbc).update(DatasetStagingBulkJdbcAdapter.MARK_ABANDONED_SQL, "x".repeat(512), "run-x", Timestamp.from(ABANDONED));
    }
}
