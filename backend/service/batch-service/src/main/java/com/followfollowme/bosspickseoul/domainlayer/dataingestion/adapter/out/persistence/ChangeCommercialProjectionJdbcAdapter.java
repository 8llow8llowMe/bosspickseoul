package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

public class ChangeCommercialProjectionJdbcAdapter implements TypedFactProjectionPort {

    private static final TypeReference<Map<String, String>> PAYLOAD = new TypeReference<>() {};

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ChangeCommercialProjectionJdbcAdapter(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Override
    public Optional<String> activeRunId(ProjectionRequest request) {
        List<String> runIds = jdbc.query("""
            SELECT a.run_id FROM dataset_active_release a
            JOIN dataset_release r ON r.run_id = a.run_id
            WHERE a.dataset=? AND a.period_code=? AND a.spatial_version=? AND a.schema_version=?
              AND a.run_id IS NOT NULL AND r.status='PUBLISHED'
            """,
            (rs, rowNum) -> rs.getString(1),
            request.dataset().name(), request.period().value(), request.spatialVersion(), request.schemaVersion());
        return runIds.stream().findFirst();
    }

    @Override
    public List<FactRow> facts(String releaseRunId) {
        return jdbc.query("""
            SELECT area_code, service_code, payload FROM dataset_fact WHERE run_id=? ORDER BY area_code, service_code
            """,
            (rs, rowNum) -> new FactRow(rowNum + 1L, rs.getString("area_code"), rs.getString("service_code"),
                readPayload(rs.getString("payload"))),
            releaseRunId);
    }

    @Override
    @Transactional
    public int replaceChangeCommercial(ProjectionRequest request, List<ChangeCommercialTypedRow> rows) {
        jdbc.update("DELETE FROM change_commercial WHERE period_code=? AND spatial_version=?",
            request.period().value(), request.spatialVersion());
        jdbc.batchUpdate("""
            INSERT INTO change_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              change_indicator_code, change_indicator_name, average_opened_months, average_closed_months)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """,
            rows, 500, this::bind);
        return rows.size();
    }

    private void bind(PreparedStatement statement, ChangeCommercialTypedRow row) throws SQLException {
        statement.setString(1, row.periodCode());
        statement.setString(2, row.spatialVersion());
        statement.setString(3, row.commercialCode());
        statement.setString(4, row.commercialClassificationCode());
        statement.setString(5, row.commercialClassificationName());
        statement.setString(6, row.commercialName());
        statement.setString(7, row.changeIndicatorCode());
        statement.setString(8, row.changeIndicatorName());
        if (row.averageOpenedMonths() == null) {
            statement.setObject(9, null);
        } else {
            statement.setInt(9, row.averageOpenedMonths());
        }
        if (row.averageClosedMonths() == null) {
            statement.setObject(10, null);
        } else {
            statement.setInt(10, row.averageClosedMonths());
        }
    }

    private Map<String, String> readPayload(String json) {
        try {
            return mapper.readValue(json, PAYLOAD);
        } catch (Exception exception) {
            throw new IllegalStateException("dataset_fact payload is not a string map", exception);
        }
    }
}
