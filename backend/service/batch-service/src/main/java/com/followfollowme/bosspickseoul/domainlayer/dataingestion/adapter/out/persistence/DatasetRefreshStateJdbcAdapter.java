package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshStatePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

/**
 * {@code dataset_refresh_state} (commercial 스키마). DDL 은 {@code backend/scripts/migration/dataset-refresh-state-schema.sql}.
 * 행 단위 upsert 라 한 문장이 원자적이고, 호출자 트랜잭션이 필요 없다.
 */
public class DatasetRefreshStateJdbcAdapter implements DatasetRefreshStatePort {

    private static final Logger log = LoggerFactory.getLogger(DatasetRefreshStateJdbcAdapter.class);

    static final String FIND_ALL_SQL = """
        SELECT dataset,last_probe_at,last_source_total,newest_source_period,last_fetch_run_id,last_fetch_raw_location,
               last_failure_at,last_failure_reason,consecutive_failures
        FROM dataset_refresh_state
        """;

    static final String UPSERT_SQL = """
        INSERT INTO dataset_refresh_state
          (dataset,last_probe_at,last_source_total,newest_source_period,last_fetch_run_id,last_fetch_raw_location,
           last_failure_at,last_failure_reason,consecutive_failures)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          last_probe_at=VALUES(last_probe_at),last_source_total=VALUES(last_source_total),
          newest_source_period=VALUES(newest_source_period),last_fetch_run_id=VALUES(last_fetch_run_id),
          last_fetch_raw_location=VALUES(last_fetch_raw_location),last_failure_at=VALUES(last_failure_at),
          last_failure_reason=VALUES(last_failure_reason),consecutive_failures=VALUES(consecutive_failures)
        """;

    static final String TABLE_EXISTS_SQL = """
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'dataset_refresh_state'
        """;

    private final JdbcTemplate jdbc;

    public DatasetRefreshStateJdbcAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<Dataset, DatasetRefreshState> findAll() {
        Map<Dataset, DatasetRefreshState> states = new EnumMap<>(Dataset.class);
        jdbc.query(FIND_ALL_SQL, (RowCallbackHandler) rs -> {
            String name = rs.getString("dataset");
            Dataset dataset;
            try {
                dataset = Dataset.valueOf(name);
            } catch (IllegalArgumentException unknown) {
                // enum 에서 빠진 데이터셋의 옛 행. 판단에 쓰지 않고 남겨 둔다.
                log.warn("[dataset-refresh] unknown dataset in dataset_refresh_state dataset={}", name);
                return;
            }
            states.put(dataset, map(dataset, rs));
        });
        return states;
    }

    @Override
    public void save(DatasetRefreshState state) {
        jdbc.update(UPSERT_SQL,
            state.dataset().name(),
            timestamp(state.lastProbeAt()),
            state.lastSourceTotal(),
            state.newestSourcePeriod() == null ? null : state.newestSourcePeriod().value(),
            state.lastFetchRunId(),
            state.lastFetchRawLocation(),
            timestamp(state.lastFailureAt()),
            state.lastFailureReason(),
            state.consecutiveFailures());
    }

    @Override
    public boolean tableExists() {
        Long tables = jdbc.queryForObject(TABLE_EXISTS_SQL, Long.class);
        return tables != null && tables > 0;
    }

    private static DatasetRefreshState map(Dataset dataset, ResultSet rs) throws SQLException {
        long total = rs.getLong("last_source_total");
        Long sourceTotal = rs.wasNull() ? null : total;
        String newest = rs.getString("newest_source_period");
        return new DatasetRefreshState(
            dataset,
            instant(rs.getTimestamp("last_probe_at")),
            sourceTotal,
            newest == null ? null : new Quarter(newest),
            rs.getString("last_fetch_run_id"),
            rs.getString("last_fetch_raw_location"),
            instant(rs.getTimestamp("last_failure_at")),
            rs.getString("last_failure_reason"),
            rs.getInt("consecutive_failures"));
    }

    private static Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
