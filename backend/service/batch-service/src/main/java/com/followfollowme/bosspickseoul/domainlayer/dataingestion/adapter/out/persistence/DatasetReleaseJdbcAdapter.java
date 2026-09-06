package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Every writer must use the shared Spring Batch repository with runId as its sole identifying parameter. */
@Component
@Profile("quarterly")
public class DatasetReleaseJdbcAdapter implements DatasetReleasePort {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public DatasetReleaseJdbcAdapter(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public void begin(ImportRequest request) {
        String fingerprint = fingerprint(request);
        jdbc.update("""
            INSERT INTO dataset_release
              (run_id,dataset,period_code,spatial_version,schema_version,source,request_fingerprint,
               source_updated_at,status,expected_rows)
            VALUES (?,?,?,?,?,?,?,?,'NEW',?)
            ON DUPLICATE KEY UPDATE run_id=run_id
            """, request.runId(), request.dataset().name(), request.period().value(), request.spatialVersion(),
            request.schemaVersion(), request.sourceType().name(), fingerprint,
            Timestamp.from(request.sourceUpdatedAt()), request.expectedRows());
        Map<String, Object> row = lockedRelease(request);
        if (!fingerprint.equals(row.get("request_fingerprint"))) {
            throw new IllegalStateException("runId belongs to a different import request");
        }
        String status = (String) row.get("status");
        if (!List.of("NEW", "FAILED", "DRY_RUN").contains(status)) {
            throw new IllegalStateException("Release is immutable or already running: " + status);
        }
        jdbc.update("DELETE FROM dataset_staging WHERE run_id=?", request.runId());
        jdbc.update("DELETE FROM dataset_rejected_row WHERE run_id=?", request.runId());
        jdbc.update("""
            UPDATE dataset_release SET status='RUNNING',failure_reason=NULL,checksum=NULL,raw_location=NULL,
              input_count=0,accepted_count=0,rejected_count=0,duplicate_count=0,unmapped_count=0,
              acquired_at=CURRENT_TIMESTAMP(6) WHERE run_id=?
            """, request.runId());
    }

    @Override
    @Transactional
    public void stage(ImportRequest request, List<FactRow> rows) {
        requireRunning(request);
        jdbc.batchUpdate("""
            INSERT INTO dataset_staging(run_id,row_number,area_code,service_code,payload)
            VALUES (?,?,?,?,CAST(? AS JSON))
            """, rows, 1000, (statement, row) -> {
                statement.setString(1, request.runId());
                statement.setLong(2, row.rowNumber());
                statement.setString(3, row.areaCode());
                statement.setString(4, row.serviceCode());
                statement.setString(5, json(row.fields()));
            });
    }

    @Override
    @Transactional
    public void reject(ImportRequest request, SourceRow row, String reason) {
        requireRunning(request);
        jdbc.update("""
            INSERT INTO dataset_rejected_row(run_id,row_number,payload,reason) VALUES (?,?,CAST(? AS JSON),?)
            """, request.runId(), row.rowNumber(), json(row.fields()), truncated(reason));
    }

    @Override
    @Transactional
    public ValidationResult validate(ImportRequest request, SourceReceipt receipt) {
        requireRunning(request);
        ValidationResult result = counts(request);
        recordResult(request, receipt, result);
        return result;
    }

    @Override
    @Transactional
    public void complete(ImportRequest request, SourceReceipt receipt, ValidationResult result) {
        requireRunning(request);
        // Recount under the same release lock used by stage/reject; stale reports cannot publish.
        ValidationResult current = counts(request);
        if (!current.equals(result) || !current.valid(request.expectedRows())
            || receipt.inputRows() != request.expectedRows()) {
            throw new IllegalStateException("Release failed completeness, natural key or spatial validation");
        }
        recordResult(request, receipt, current);
        if (request.dryRun()) {
            jdbc.update("UPDATE dataset_release SET status='DRY_RUN' WHERE run_id=?", request.runId());
            return;
        }
        // Inserting/locking the exact slot serializes independent runs publishing the same dataset version.
        jdbc.update("""
            INSERT INTO dataset_active_release(dataset,period_code,spatial_version,schema_version,run_id)
            VALUES (?,?,?,?,NULL) ON DUPLICATE KEY UPDATE dataset=dataset
            """, slot(request));
        List<Map<String, Object>> active = jdbc.queryForList("""
            SELECT r.source_updated_at FROM dataset_active_release a
            LEFT JOIN dataset_release r ON r.run_id=a.run_id
            WHERE a.dataset=? AND a.period_code=? AND a.spatial_version=? AND a.schema_version=? FOR UPDATE
            """, slot(request));
        if (!active.isEmpty() && active.getFirst().get("source_updated_at") instanceof Timestamp updated
            && updated.toInstant().isAfter(request.sourceUpdatedAt())) {
            throw new IllegalStateException("A newer source revision is already active");
        }
        int inserted = jdbc.update("""
            INSERT INTO dataset_fact(run_id,area_code,service_code,payload)
            SELECT run_id,area_code,service_code,payload FROM dataset_staging WHERE run_id=?
            """, request.runId());
        if (inserted != current.acceptedRows()) throw new IllegalStateException("Published row count changed");
        jdbc.update("UPDATE dataset_release SET status='PUBLISHED',published_at=CURRENT_TIMESTAMP(6) WHERE run_id=?", request.runId());
        jdbc.update("""
            UPDATE dataset_active_release SET run_id=?
            WHERE dataset=? AND period_code=? AND spatial_version=? AND schema_version=?
            """, request.runId(), request.dataset().name(), request.period().value(), request.spatialVersion(), request.schemaVersion());
    }

    @Override
    @Transactional
    public void fail(ImportRequest request, String reason) {
        jdbc.update("""
            UPDATE dataset_release SET status='FAILED',failure_reason=?
            WHERE run_id=? AND request_fingerprint=? AND status='RUNNING'
            """, truncated(reason), request.runId(), fingerprint(request));
    }

    private ValidationResult counts(ImportRequest request) {
        long accepted = count("SELECT COUNT(*) FROM dataset_staging WHERE run_id=?", request.runId());
        long rejected = count("SELECT COUNT(*) FROM dataset_rejected_row WHERE run_id=?", request.runId());
        long duplicate = count("""
            SELECT COUNT(*) FROM (SELECT area_code,service_code FROM dataset_staging WHERE run_id=?
              GROUP BY area_code,service_code HAVING COUNT(*)>1) duplicate_keys
            """, request.runId());
        long unmapped = count("""
            SELECT COUNT(*) FROM dataset_staging s
            WHERE s.run_id=? AND NOT EXISTS (
              SELECT 1 FROM dataset_spatial_area a JOIN dataset_spatial_release r
                ON r.spatial_version=a.spatial_version AND r.status='READY'
              WHERE a.spatial_version=? AND a.area_type=? AND a.area_code=s.area_code)
            """, request.runId(), request.spatialVersion(), request.dataset().areaType());
        return new ValidationResult(accepted, rejected, duplicate, unmapped);
    }

    private void recordResult(ImportRequest request, SourceReceipt receipt, ValidationResult result) {
        jdbc.update("""
            UPDATE dataset_release SET checksum=?,raw_location=?,input_count=?,accepted_count=?,
              rejected_count=?,duplicate_count=?,unmapped_count=? WHERE run_id=?
            """, receipt.checksum(), receipt.rawLocation(), receipt.inputRows(), result.acceptedRows(),
            result.rejectedRows(), result.duplicateKeys(), result.unmappedRows(), request.runId());
    }

    private Map<String, Object> lockedRelease(ImportRequest request) {
        return jdbc.queryForMap("SELECT status,request_fingerprint FROM dataset_release WHERE run_id=? FOR UPDATE", request.runId());
    }

    private void requireRunning(ImportRequest request) {
        Map<String, Object> row = lockedRelease(request);
        if (!"RUNNING".equals(row.get("status")) || !fingerprint(request).equals(row.get("request_fingerprint"))) {
            throw new IllegalStateException("Release is not running for this request");
        }
    }

    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        if (value == null) throw new IllegalStateException("Missing validation count");
        return value;
    }

    private Object[] slot(ImportRequest request) {
        return new Object[]{request.dataset().name(), request.period().value(), request.spatialVersion(), request.schemaVersion()};
    }

    private String fingerprint(ImportRequest request) {
        try {
            String value = json(List.of(request.dataset().name(), request.period().value(), request.spatialVersion(),
                request.schemaVersion(), request.sourceType().name(),
                request.sourceFile() == null ? "" : request.sourceFile().toAbsolutePath().normalize().toString(),
                request.charset(), request.dryRun(), request.expectedRows(), request.sourceUpdatedAt().toString()));
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalArgumentException("Cannot serialize source row", exception); }
    }

    private String truncated(String reason) {
        return reason == null ? "Import failed" : reason.substring(0, Math.min(512, reason.length()));
    }
}
