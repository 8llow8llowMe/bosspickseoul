package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class DatasetReleaseJdbcAdapterTest {
    private JdbcTemplate jdbc;
    private DatasetReleaseJdbcAdapter adapter;
    private final AtomicReference<String> fingerprint = new AtomicReference<>();
    private final AtomicReference<String> status = new AtomicReference<>("NEW");
    private final SourceReceipt receipt = new SourceReceipt("a".repeat(64), "/raw/data.csv", 2);
    private final ValidationResult valid = new ValidationResult(2, 0, 0, 0);

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        adapter = new DatasetReleaseJdbcAdapter(jdbc, new ObjectMapper());
        when(jdbc.update(anyString(), any(Object[].class))).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.contains("INSERT INTO dataset_release")) {
                fingerprint.compareAndSet(null, invocation.getArgument(7));
            }
            return sql.contains("INSERT INTO dataset_fact") ? 2 : 1;
        });
        when(jdbc.queryForMap(anyString(), any(Object[].class))).thenAnswer(invocation ->
            Map.of("status", status.get(), "request_fingerprint", fingerprint.get()));
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            return sql.equals("SELECT COUNT(*) FROM dataset_staging WHERE run_id=?") ? 2L : 0L;
        });
    }

    @Test
    void dryRunRecordsCountsWithoutPublishing() {
        ImportRequest request = request(true, 2, "legacy-2023");
        start(request);
        adapter.complete(request, receipt, valid);
        verify(jdbc).update(contains("status='DRY_RUN'"), eq(request.runId()));
        verify(jdbc, never()).update(contains("INSERT INTO dataset_fact"), any(Object[].class));
        verify(jdbc, never()).update(contains("dataset_active_release"), any(Object[].class));
    }

    @Test
    void publicationCopiesFactsAndUpdatesOnlyExactVersionSlot() {
        ImportRequest request = request(false, 2, "standard-2024");
        start(request);
        adapter.complete(request, receipt, valid);
        verify(jdbc).update(contains("INSERT INTO dataset_fact"), eq("test-run"));
        verify(jdbc).update(contains("UPDATE dataset_active_release SET run_id=?"),
            eq("test-run"), eq("SALES_COMMERCIAL"), eq("20241"), eq("standard-2024"), eq("seoul-v1"));
        verify(jdbc, never()).update(contains("DELETE FROM dataset_fact"), any(Object[].class));
    }

    @Test
    void publicationRecountsAndRejectsMissingSpatialCodes() {
        ImportRequest request = request(false, 2, "unknown-spatial");
        start(request);
        when(jdbc.queryForObject(contains("NOT EXISTS"), eq(Long.class), any(Object[].class))).thenReturn(2L);
        assertThatThrownBy(() -> adapter.complete(request, receipt, valid)).isInstanceOf(IllegalStateException.class);
        verify(jdbc, never()).update(contains("INSERT INTO dataset_fact"), any(Object[].class));
    }

    @Test
    void inputCountMismatchCannotPublish() {
        ImportRequest request = request(false, 2, "legacy-2023");
        start(request);
        assertThatThrownBy(() -> adapter.complete(request, new SourceReceipt("a".repeat(64), "/raw", 3), valid))
            .isInstanceOf(IllegalStateException.class);
        verify(jdbc, never()).update(contains("dataset_active_release"), any(Object[].class));
    }

    @Test
    void olderSourceRevisionCannotReplaceNewerActiveRelease() {
        ImportRequest request = request(false, 2, "standard-2024");
        start(request);
        when(jdbc.queryForList(contains("SELECT r.source_updated_at"), any(Object[].class)))
            .thenReturn(List.of(Map.of("source_updated_at", Timestamp.from(request.sourceUpdatedAt().plusSeconds(1)))));
        assertThatThrownBy(() -> adapter.complete(request, receipt, valid)).hasMessageContaining("newer source revision");
        verify(jdbc, never()).update(contains("INSERT INTO dataset_fact"), any(Object[].class));
    }

    @Test
    void failedValidationRetainsAuditCounts() {
        ImportRequest request = request(false, 2, "legacy-2023");
        start(request);
        when(jdbc.queryForObject(contains("duplicate_keys"), eq(Long.class), any(Object[].class))).thenReturn(1L);
        assertThat(adapter.validate(request, receipt).duplicateKeys()).isEqualTo(1);
        verify(jdbc).update(contains("UPDATE dataset_release SET checksum=?"),
            eq(receipt.checksum()), eq(receipt.rawLocation()), eq(2L), eq(2L), eq(0L), eq(1L), eq(0L), eq("test-run"));
    }

    @Test
    void publishedAndRunningRunIdsCannotBeReused() {
        ImportRequest request = request(false, 2, "legacy-2023");
        start(request);
        clearInvocations(jdbc);
        assertThatThrownBy(() -> adapter.begin(request)).hasMessageContaining("already running");
        status.set("PUBLISHED");
        assertThatThrownBy(() -> adapter.begin(request)).hasMessageContaining("immutable");
        verify(jdbc, never()).update(startsWith("DELETE"), any(Object[].class));
    }

    @Test
    void failedRunCannotChangeExpectedCountOrSpatialVersion() {
        start(request(false, 2, "legacy-2023"));
        status.set("FAILED");
        assertThatThrownBy(() -> adapter.begin(request(false, 3, "legacy-2023")))
            .hasMessageContaining("different import request");
        assertThatThrownBy(() -> adapter.begin(request(false, 2, "standard-2024")))
            .hasMessageContaining("different import request");
    }

    @Test
    void failedRunCannotChangeSourceFreshness() {
        ImportRequest original = request(false, 2, "legacy-2023");
        start(original);
        status.set("FAILED");
        ImportRequest changed = new ImportRequest(original.runId(), original.dataset(), original.period(),
            original.spatialVersion(), original.schemaVersion(), original.sourceType(), original.sourceFile(),
            original.charset(), original.dryRun(), original.expectedRows(), original.sourceUpdatedAt().plusSeconds(1));
        assertThatThrownBy(() -> adapter.begin(changed)).hasMessageContaining("different import request");
    }

    @Test
    void exactFailedRetryClearsOnlyItsOwnTransientRows() {
        ImportRequest request = request(false, 2, "legacy-2023");
        start(request);
        status.set("FAILED");
        clearInvocations(jdbc);
        adapter.begin(request);
        verify(jdbc).update("DELETE FROM dataset_staging WHERE run_id=?", "test-run");
        verify(jdbc).update("DELETE FROM dataset_rejected_row WHERE run_id=?", "test-run");
        verify(jdbc, never()).update(contains("dataset_fact"), any(Object[].class));
    }

    @Test
    void failureUpdateCannotDowngradePublishedRelease() {
        ImportRequest request = request(false, 2, "legacy-2023");
        start(request);
        adapter.fail(request, "source failed");
        verify(jdbc).update(contains("AND status='RUNNING'"), eq("source failed"), eq("test-run"), eq(fingerprint.get()));
    }

    private void start(ImportRequest request) {
        adapter.begin(request);
        status.set("RUNNING");
    }

    private ImportRequest request(boolean dryRun, long expected, String spatial) {
        return new ImportRequest("test-run", Dataset.SALES_COMMERCIAL, new Quarter("20241"), spatial,
            "seoul-v1", ImportRequest.SourceType.API, null, "UTF-8", dryRun, expected, Instant.parse("2026-09-06T00:00:00Z"));
    }
}
