package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeCandidate.Kind;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetStagingBulkPort;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 스테이징 정리 JDBC. 트랜잭션으로 묶지 않는다. 문장마다 autocommit 이라 락을 문장 하나 동안만 잡는다.
 *
 * <p>예전 {@code DELETE ... WHERE run_id IN (SELECT ...) LIMIT ?} 는 LIMIT 때문에 semijoin 으로 바뀌지 못해 청크마다
 * {@code dataset_staging} 을 PK 순으로 전부 훑고, 훑은 레코드마다 next-key 락을 걸어 05:00 적재의 스테이징 INSERT 와 부딪혔다.
 * 그래서 후보 run 을 잠금 없는 SELECT 로 먼저 고르고, run 마다 {@code WHERE run_id = ? LIMIT ?} 로 PK 선두
 * ({@code (run_id, source_row_number)}) 범위만 지운다. {@code dataset_rejected_row} 도 PK 가 같은 모양이다.
 *
 * <p>삭제 문장마다 그 run 이 아직 대상 상태이고 활성 포인터가 가리키지 않는지 다시 본다. 후보를 고른 뒤 같은 run-id 로 재실행이
 * 시작됐거나(DRY_RUN → RUNNING) 포인터가 바뀌어도 지우지 않는다. 두 서브쿼리는 대상 테이블이 아니라 MySQL 1093 이 없고,
 * {@code dataset_release} PK 와 {@code dataset_active_release} FK 인덱스(run_id 선두)를 한 점으로 읽는다.
 */
public class DatasetStagingBulkJdbcAdapter implements DatasetStagingBulkPort {

    static final String CANDIDATES_SQL = """
        SELECT r.run_id, r.status
          FROM dataset_release r
          LEFT JOIN dataset_active_release a ON a.run_id = r.run_id
         WHERE a.run_id IS NULL
           AND ((r.status IN ('DRY_RUN','FAILED') AND r.acquired_at < ?)
             OR (r.status = 'PUBLISHED' AND r.published_at < ?)
             OR (r.status IN ('NEW','RUNNING') AND r.acquired_at < ?))
         ORDER BY r.run_id
        """;

    static final String MARK_ABANDONED_SQL = """
        UPDATE dataset_release SET status='FAILED', failure_reason=?
         WHERE run_id=? AND status IN ('NEW','RUNNING') AND acquired_at < ?
        """;

    static final String DELETE_STAGING_SQL = """
        DELETE FROM dataset_staging
         WHERE run_id = ?
           AND EXISTS (SELECT 1 FROM dataset_release r WHERE r.run_id = ? AND r.status IN (?, ?))
           AND NOT EXISTS (SELECT 1 FROM dataset_active_release a WHERE a.run_id = ?)
         LIMIT ?
        """;

    static final String DELETE_REJECTED_SQL = """
        DELETE FROM dataset_rejected_row
         WHERE run_id = ?
           AND EXISTS (SELECT 1 FROM dataset_release r WHERE r.run_id = ? AND r.status IN (?, ?))
           AND NOT EXISTS (SELECT 1 FROM dataset_active_release a WHERE a.run_id = ?)
         LIMIT ?
        """;

    private static final int FAILURE_REASON_MAX_LENGTH = 512;

    private final JdbcTemplate jdbc;

    public DatasetStagingBulkJdbcAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<StagingPurgeCandidate> findPurgeCandidates(Instant unpublishedBefore, Instant publishedBefore, Instant abandonedBefore) {
        return jdbc.query(CANDIDATES_SQL,
            (rs, rowNum) -> new StagingPurgeCandidate(rs.getString("run_id"), kind(rs.getString("status"))),
            Timestamp.from(unpublishedBefore), Timestamp.from(publishedBefore), Timestamp.from(abandonedBefore));
    }

    @Override
    public boolean markAbandoned(String runId, Instant abandonedBefore, String reason) {
        String truncated = reason.length() <= FAILURE_REASON_MAX_LENGTH ? reason : reason.substring(0, FAILURE_REASON_MAX_LENGTH);
        return jdbc.update(MARK_ABANDONED_SQL, truncated, runId, Timestamp.from(abandonedBefore)) == 1;
    }

    @Override
    public long deleteStaging(StagingPurgeCandidate candidate, int chunkSize) {
        return deleteInChunks(DELETE_STAGING_SQL, candidate, chunkSize);
    }

    @Override
    public long deleteRejectedRows(StagingPurgeCandidate candidate, int chunkSize) {
        return deleteInChunks(DELETE_REJECTED_SQL, candidate, chunkSize);
    }

    /** 한 문장이 그 run 의 PK 범위에서 최대 {@code chunkSize} 행을 지우고 바로 커밋한다. 짧게 끝난 청크가 마지막이다. */
    private long deleteInChunks(String sql, StagingPurgeCandidate candidate, int chunkSize) {
        String[] statuses = expectedStatuses(candidate.kind());
        String runId = candidate.runId();
        long total = 0;
        int deleted;
        do {
            deleted = jdbc.update(sql, runId, runId, statuses[0], statuses[1], runId, chunkSize);
            total += deleted;
        } while (deleted == chunkSize);
        return total;
    }

    /** 삭제 시점에 그 run 이 있어야 하는 상태. 버려진 run 은 이미 FAILED 로 표시한 뒤다. 바인딩 자리가 둘이라 하나뿐이면 반복한다. */
    static String[] expectedStatuses(Kind kind) {
        return switch (kind) {
            case UNPUBLISHED -> new String[] {"DRY_RUN", "FAILED"};
            case SUPERSEDED -> new String[] {"PUBLISHED", "PUBLISHED"};
            case ABANDONED -> new String[] {"FAILED", "FAILED"};
        };
    }

    private static Kind kind(String status) {
        return switch (status) {
            case "DRY_RUN", "FAILED" -> Kind.UNPUBLISHED;
            case "PUBLISHED" -> Kind.SUPERSEDED;
            case "NEW", "RUNNING" -> Kind.ABANDONED;
            default -> throw new IllegalStateException("Unexpected dataset_release status " + status);
        };
    }
}
