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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
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
    void everyDatasetHasATypedTableAndTheCountGroupsByQuarterForOneSpatialVersion() {
        for (Dataset dataset : Dataset.values()) {
            String table = ChangeCommercialProjectionJdbcAdapter.typedTable(dataset);
            assertThat(table).as("%s", dataset).isNotBlank();
            assertThat(ChangeCommercialProjectionJdbcAdapter.typedRowCountSql(dataset))
                .isEqualTo("SELECT period_code, COUNT(*) AS typed_rows FROM " + table
                    + " WHERE period_code >= ? AND spatial_version = ? GROUP BY period_code");
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
            .typedRowCounts(Dataset.CHANGE_COMMERCIAL, "legacy-20233", new Quarter("20234"));

        assertThat(counts).containsExactly(Map.entry(new Quarter("20261"), 1650L));
        // 첫 바인딩이 분기 하한이다(유니크 인덱스 선두 컬럼 범위). 레거시 20211~20233 은 세지 않는다.
        verify(jdbc).query(eq(ChangeCommercialProjectionJdbcAdapter.typedRowCountSql(Dataset.CHANGE_COMMERCIAL)), any(RowCallbackHandler.class),
            eq("20234"), eq("legacy-20233"));
    }

    @Test
    void stateUpsertBindsEveryColumnInOrder() {
        DatasetRefreshState state = new DatasetRefreshState(Dataset.CHANGE_DISTRICT, Instant.parse("2026-09-30T20:00:00Z"), 550L,
            new Quarter("20262"), "auto-fetch", "/app/data/raw/auto-fetch-1", Instant.parse("2026-09-29T20:00:00Z"), "IMPLAUSIBLE", 2,
            new Quarter("20241"));

        new DatasetRefreshStateJdbcAdapter(jdbc).save(state);

        verify(jdbc).update(DatasetRefreshStateJdbcAdapter.UPSERT_SQL,
            "CHANGE_DISTRICT", Timestamp.from(Instant.parse("2026-09-30T20:00:00Z")), 550L, "20262", "auto-fetch",
            "/app/data/raw/auto-fetch-1", Timestamp.from(Instant.parse("2026-09-29T20:00:00Z")), "IMPLAUSIBLE", 2, "20241");
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
        when(known.getString("last_reproject_dry_run_period")).thenReturn("20241");
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
        assertThat(state.lastReprojectDryRunPeriod()).isEqualTo(new Quarter("20241"));
    }

    /**
     * 런북 DDL 과 어댑터 문장이 같은 컬럼을 본다. 컬럼을 한쪽에만 더하면 개발 DB 에서 첫 run 이 "Unknown column" 으로
     * 데이터셋마다 실패하고서야 드러난다. {@code updated_at} 은 DB 가 채우므로 문장에 없다.
     */
    @Test
    void stateStatementsCoverExactlyTheColumnsOfTheRunbookDdl() throws Exception {
        String ddl = Files.readString(Path.of("..", "..", "scripts", "migration", "dataset-refresh-state-schema.sql"), StandardCharsets.UTF_8);
        Matcher table = Pattern.compile("CREATE TABLE IF NOT EXISTS dataset_refresh_state \\((.*?)\\) ENGINE", Pattern.DOTALL).matcher(ddl);
        assertThat(table.find()).isTrue();
        List<String> ddlColumns = new ArrayList<>();
        Matcher column = Pattern.compile("^\\s*([a-z_]+)\\s+[A-Z]", Pattern.MULTILINE).matcher(table.group(1));
        while (column.find()) {
            ddlColumns.add(column.group(1));
        }
        assertThat(ddlColumns).contains("dataset", "last_reproject_dry_run_period", "updated_at");
        ddlColumns.remove("updated_at");

        String upsert = DatasetRefreshStateJdbcAdapter.UPSERT_SQL;
        List<String> insertColumns = columns(upsert.substring(upsert.indexOf('(') + 1, upsert.indexOf(')')));
        List<String> selectColumns = columns(DatasetRefreshStateJdbcAdapter.FIND_ALL_SQL.replaceAll("(?s)^\\s*SELECT|FROM.*$", ""));
        List<String> updatedColumns = new ArrayList<>();
        Matcher assignment = Pattern.compile("([a-z_]+)=VALUES\\(\\1\\)").matcher(upsert);
        while (assignment.find()) {
            updatedColumns.add(assignment.group(1));
        }

        assertThat(insertColumns).containsExactlyElementsOf(ddlColumns);
        assertThat(selectColumns).containsExactlyElementsOf(ddlColumns);
        assertThat(updatedColumns).as("PK 를 뺀 모든 컬럼을 덮어쓴다").containsExactlyElementsOf(ddlColumns.subList(1, ddlColumns.size()));
        assertThat(upsert.chars().filter(ch -> ch == '?').count()).isEqualTo(ddlColumns.size());
        assertThat(DatasetRefreshStateJdbcAdapter.REQUIRED_COLUMNS).as("기동 가드가 보는 컬럼").containsExactlyElementsOf(ddlColumns);
    }

    @Test
    void missingColumnsComparesTheCurrentSchemaWithTheRequiredColumns() {
        when(jdbc.queryForList(DatasetRefreshStateJdbcAdapter.COLUMNS_SQL, String.class)).thenReturn(List.of(
            "DATASET", "last_probe_at", "last_source_total", "newest_source_period", "last_fetch_run_id", "last_fetch_raw_location",
            "last_failure_at", "last_failure_reason", "consecutive_failures", "updated_at"));

        assertThat(new DatasetRefreshStateJdbcAdapter(jdbc).missingColumns()).containsExactly("last_reproject_dry_run_period");
        assertThat(DatasetRefreshStateJdbcAdapter.COLUMNS_SQL)
            .contains("information_schema.columns").contains("table_schema = DATABASE()").contains("table_name = 'dataset_refresh_state'");
    }

    private static List<String> columns(String list) {
        return Arrays.stream(list.split(",")).map(String::trim).filter(name -> !name.isEmpty()).toList();
    }

    /** 기동 가드가 켜기 전에 본다. commercialJdbcTemplate 으로 나가므로 DATABASE() 가 commercial 스키마다. */
    @Test
    void tableExistsLooksUpTheStateTableInTheCurrentSchema() {
        when(jdbc.queryForObject(DatasetRefreshStateJdbcAdapter.TABLE_EXISTS_SQL, Long.class)).thenReturn(1L, 0L);
        DatasetRefreshStateJdbcAdapter adapter = new DatasetRefreshStateJdbcAdapter(jdbc);

        assertThat(adapter.tableExists()).isTrue();
        assertThat(adapter.tableExists()).isFalse();
        assertThat(DatasetRefreshStateJdbcAdapter.TABLE_EXISTS_SQL)
            .contains("information_schema.tables").contains("table_schema = DATABASE()").contains("table_name = 'dataset_refresh_state'");
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
