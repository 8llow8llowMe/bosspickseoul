package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

/**
 * 자동 최신화가 읽는 조회와 상태 upsert. MySQL 전용 문장이라 H2 로 돌리지 않고, 기존 테스트처럼 문장과 바인딩을 대조한다.
 */
class DatasetRefreshQueriesTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test
    void publishedSlotsReadOnlyPublishedPointersOfTheExactVersionInQuarterOrder() {
        new DatasetReleaseJdbcAdapter(jdbc, new ObjectMapper()).publishedSlots(Dataset.SALES_COMMERCIAL, "legacy-20233", "seoul-v1");

        verify(jdbc).query(eq(DatasetReleaseJdbcAdapter.PUBLISHED_SLOTS_SQL), any(org.springframework.jdbc.core.RowMapper.class),
            eq("SALES_COMMERCIAL"), eq("legacy-20233"), eq("seoul-v1"));
        assertThat(DatasetReleaseJdbcAdapter.PUBLISHED_SLOTS_SQL)
            .contains("r.status='PUBLISHED'")
            .contains("a.spatial_version=?").contains("a.schema_version=?")
            .contains("ORDER BY a.period_code");
    }

    @Test
    void spatialReadyRequiresAReadySnapshot() {
        when(jdbc.queryForObject(DatasetReleaseJdbcAdapter.SPATIAL_READY_SQL, Long.class, "legacy-20233")).thenReturn(1L);
        DatasetReleaseJdbcAdapter adapter = new DatasetReleaseJdbcAdapter(jdbc, new ObjectMapper());

        assertThat(adapter.spatialReady("legacy-20233")).isTrue();
        assertThat(adapter.spatialReady("unknown")).isFalse();
    }

    @Test
    void everyDatasetHasATypedTableAndTheCountGroupsByQuarterForOneSpatialVersion() {
        for (Dataset dataset : Dataset.values()) {
            String table = ChangeCommercialProjectionJdbcAdapter.typedTable(dataset);
            assertThat(table).as("%s", dataset).isNotBlank();
            assertThat(ChangeCommercialProjectionJdbcAdapter.typedRowCountSql(dataset))
                .isEqualTo("SELECT period_code, COUNT(*) AS typed_rows FROM " + table + " WHERE spatial_version=? GROUP BY period_code");
        }
    }

    /** coverage.sql 5절이 운영자가 보는 이관 판정이다. 자동 최신화가 다른 테이블을 세면 둘이 엇갈린다. */
    @Test
    void typedTablesAgreeWithCoverageSqlSectionFive() throws Exception {
        String sql = Files.readString(Path.of("..", "..", "scripts", "migration", "quarterly-import-coverage.sql"), StandardCharsets.UTF_8);
        Matcher matcher = Pattern.compile("SELECT '([A-Z_]+)',\\s+period_code, spatial_version, COUNT\\(\\*\\) FROM ([a-z_]+)").matcher(sql);
        Map<Dataset, String> tables = new LinkedHashMap<>();
        while (matcher.find()) {
            tables.put(Dataset.valueOf(matcher.group(1)), matcher.group(2));
        }
        assertThat(tables).hasSize(Dataset.values().length);
        tables.forEach((dataset, table) -> assertThat(ChangeCommercialProjectionJdbcAdapter.typedTable(dataset)).as("%s", dataset).isEqualTo(table));
    }

    @Test
    void typedRowCountsMapPeriodsToCounts() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("period_code")).thenReturn("20261");
        when(rs.getLong("typed_rows")).thenReturn(1650L);
        doAnswer(invocation -> {
            ((RowCallbackHandler) invocation.getArgument(1)).processRow(rs);
            return null;
        }).when(jdbc).query(anyString(), any(RowCallbackHandler.class), any(Object[].class));

        Map<Quarter, Long> counts = new ChangeCommercialProjectionJdbcAdapter(jdbc, new ObjectMapper())
            .typedRowCounts(Dataset.CHANGE_COMMERCIAL, "legacy-20233");

        assertThat(counts).containsExactly(Map.entry(new Quarter("20261"), 1650L));
    }

    @Test
    void stateUpsertBindsEveryColumnInOrder() {
        DatasetRefreshState state = new DatasetRefreshState(Dataset.CHANGE_DISTRICT, Instant.parse("2026-09-30T20:00:00Z"), 550L,
            new Quarter("20262"), "auto-fetch", "/app/data/raw/auto-fetch-1", Instant.parse("2026-09-29T20:00:00Z"), "IMPLAUSIBLE", 2);

        new DatasetRefreshStateJdbcAdapter(jdbc).save(state);

        verify(jdbc).update(DatasetRefreshStateJdbcAdapter.UPSERT_SQL,
            "CHANGE_DISTRICT", Timestamp.from(Instant.parse("2026-09-30T20:00:00Z")), 550L, "20262", "auto-fetch",
            "/app/data/raw/auto-fetch-1", Timestamp.from(Instant.parse("2026-09-29T20:00:00Z")), "IMPLAUSIBLE", 2);
        assertThat(DatasetRefreshStateJdbcAdapter.UPSERT_SQL).contains("ON DUPLICATE KEY UPDATE").contains("consecutive_failures=VALUES(consecutive_failures)");
    }

    @Test
    void findAllMapsRowsAndSkipsDatasetsNoLongerInTheEnum() throws Exception {
        ResultSet known = mock(ResultSet.class);
        when(known.getString("dataset")).thenReturn("CHANGE_DISTRICT");
        when(known.getLong("last_source_total")).thenReturn(0L);
        when(known.wasNull()).thenReturn(true);
        when(known.getString("newest_source_period")).thenReturn("20262");
        when(known.getInt("consecutive_failures")).thenReturn(1);
        ResultSet unknown = mock(ResultSet.class);
        when(unknown.getString("dataset")).thenReturn("RETIRED_DATASET");
        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            handler.processRow(known);
            handler.processRow(unknown);
            return null;
        }).when(jdbc).query(eq(DatasetRefreshStateJdbcAdapter.FIND_ALL_SQL), any(RowCallbackHandler.class));

        Map<Dataset, DatasetRefreshState> states = new DatasetRefreshStateJdbcAdapter(jdbc).findAll();

        assertThat(states).containsOnlyKeys(Dataset.CHANGE_DISTRICT);
        DatasetRefreshState state = states.get(Dataset.CHANGE_DISTRICT);
        assertThat(state.lastSourceTotal()).isNull();
        assertThat(state.newestSourcePeriod()).isEqualTo(new Quarter("20262"));
        assertThat(state.consecutiveFailures()).isEqualTo(1);
    }

    @Test
    void stateTransitionsKeepTheLastFailureButResetTheStreakOnSuccess() {
        DatasetRefreshState failed = DatasetRefreshState.initial(Dataset.CHANGE_DISTRICT)
            .failed(Instant.parse("2026-09-30T20:00:00Z"), "x".repeat(600))
            .failed(Instant.parse("2026-10-01T20:00:00Z"), "again");

        assertThat(failed.consecutiveFailures()).isEqualTo(2);
        DatasetRefreshState recovered = failed.succeeded();
        assertThat(recovered.consecutiveFailures()).isZero();
        assertThat(recovered.lastFailureReason()).isEqualTo("again");
        assertThat(DatasetRefreshState.initial(Dataset.CHANGE_DISTRICT).failed(Instant.EPOCH, "x".repeat(600)).lastFailureReason())
            .hasSize(DatasetRefreshState.FAILURE_REASON_MAX_LENGTH);
    }
}
