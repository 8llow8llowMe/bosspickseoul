package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetStagingPurgePort;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 스테이징 청크 삭제. 한 문장이 {@code LIMIT} 행까지만 지우고 바로 커밋(autocommit)해 락을 짧게 유지한다. 트랜잭션으로 묶지 않는다.
 * 청크 반복은 원천 단위가 "한 문장 = 최대 N 행" 이라 루프가 곧 벌크다(N+1 이 아니다).
 *
 * <p>모든 문장이 {@code dataset_active_release} 가 가리키는 run 을 제외한다. 상태 조건은 문장 안에서 평가되므로 그 사이 RUNNING 으로
 * 바뀐 run(재시도)은 지우지 않는다.
 */
public class DatasetStagingPurgeJdbcAdapter implements DatasetStagingPurgePort {

    private static final String NOT_ACTIVE = "AND r.run_id NOT IN (SELECT a.run_id FROM dataset_active_release a WHERE a.run_id IS NOT NULL)";

    static final String UNPUBLISHED_STAGING_SQL = "DELETE FROM dataset_staging WHERE run_id IN ("
        + "SELECT r.run_id FROM dataset_release r WHERE r.status IN ('DRY_RUN','FAILED') AND r.acquired_at < ? " + NOT_ACTIVE
        + ") LIMIT ?";

    static final String UNPUBLISHED_REJECTED_SQL = "DELETE FROM dataset_rejected_row WHERE run_id IN ("
        + "SELECT r.run_id FROM dataset_release r WHERE r.status IN ('DRY_RUN','FAILED') AND r.acquired_at < ? " + NOT_ACTIVE
        + ") LIMIT ?";

    static final String SUPERSEDED_STAGING_SQL = "DELETE FROM dataset_staging WHERE run_id IN ("
        + "SELECT r.run_id FROM dataset_release r WHERE r.status='PUBLISHED' AND r.published_at < ? " + NOT_ACTIVE
        + ") LIMIT ?";

    private final JdbcTemplate jdbc;

    public DatasetStagingPurgeJdbcAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public long deleteUnpublishedStaging(Instant acquiredBefore, int chunkSize) {
        return deleteInChunks(UNPUBLISHED_STAGING_SQL, acquiredBefore, chunkSize);
    }

    @Override
    public long deleteUnpublishedRejectedRows(Instant acquiredBefore, int chunkSize) {
        return deleteInChunks(UNPUBLISHED_REJECTED_SQL, acquiredBefore, chunkSize);
    }

    @Override
    public long deleteSupersededPublishedStaging(Instant publishedBefore, int chunkSize) {
        return deleteInChunks(SUPERSEDED_STAGING_SQL, publishedBefore, chunkSize);
    }

    private long deleteInChunks(String sql, Instant cutoff, int chunkSize) {
        Timestamp before = Timestamp.from(cutoff);
        long total = 0;
        int deleted;
        do {
            deleted = jdbc.update(sql, before, chunkSize);
            total += deleted;
        } while (deleted == chunkSize);
        return total;
    }
}
