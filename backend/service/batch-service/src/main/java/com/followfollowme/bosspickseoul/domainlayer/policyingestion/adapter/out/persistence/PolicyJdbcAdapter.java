package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyUpsert;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.port.out.PolicyCommandPort;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PolicyJdbcAdapter implements PolicyCommandPort {

    private static final int BATCH_SIZE = 200;

    private static final String UPSERT_SQL = """
        INSERT INTO policy (
            id, title, organization, support_type, target_summary, support_content,
            district_code, service_category_code, apply_start_at, apply_end_at, detail_url,
            source, external_id, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            organization = VALUES(organization),
            support_type = VALUES(support_type),
            target_summary = VALUES(target_summary),
            support_content = VALUES(support_content),
            district_code = VALUES(district_code),
            service_category_code = VALUES(service_category_code),
            apply_start_at = VALUES(apply_start_at),
            apply_end_at = VALUES(apply_end_at),
            detail_url = VALUES(detail_url),
            last_seen_at = VALUES(last_seen_at)
        """;

    private static final String COUNT_SQL = "SELECT COUNT(*) FROM policy WHERE source = ?";

    private static final String STALE_SQL = """
        UPDATE policy
        SET apply_end_at = ?
        WHERE source = ?
          AND last_seen_at < ?
          AND (apply_end_at IS NULL OR apply_end_at >= ?)
        """;

    private static final String DELETE_SQL = "DELETE FROM policy WHERE source = ? AND last_seen_at < ?";

    private final JdbcTemplate jdbcTemplate;
    private final SnowflakeIdGenerator snowflakeIdGenerator;

    @Override
    public long countBySource(PolicySource source) {
        Long count = jdbcTemplate.queryForObject(COUNT_SQL, Long.class, source.name());
        return count == null ? 0L : count;
    }

    @Override
    public void upsertAll(PolicySource source, List<PolicyUpsert> rows, LocalDateTime seenAt) {
        for (int start = 0; start < rows.size(); start += BATCH_SIZE) {
            int end = Math.min(start + BATCH_SIZE, rows.size());
            List<PolicyUpsert> chunk = rows.subList(start, end);
            jdbcTemplate.batchUpdate(UPSERT_SQL, new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    PolicyUpsert row = chunk.get(i);
                    ps.setLong(1, snowflakeIdGenerator.generateId());
                    ps.setString(2, row.title());
                    ps.setString(3, row.organization());
                    ps.setString(4, row.supportType());
                    ps.setString(5, row.targetSummary());
                    ps.setString(6, row.supportContent());
                    setNullableString(ps, 7, row.districtCode());
                    setNullableString(ps, 8, row.serviceCategoryCode());
                    setNullableDate(ps, 9, row.applyStartAt());
                    setNullableDate(ps, 10, row.applyEndAt());
                    ps.setString(11, row.detailUrl());
                    ps.setString(12, source.name());
                    ps.setString(13, row.externalId());
                    ps.setTimestamp(14, Timestamp.valueOf(seenAt));
                }

                @Override
                public int getBatchSize() {
                    return chunk.size();
                }
            });
        }
    }

    @Override
    public int staleMarkUnseen(PolicySource source, LocalDateTime seenAt, LocalDate hideEndAt) {
        return jdbcTemplate.update(
            STALE_SQL,
            Date.valueOf(hideEndAt),
            source.name(),
            Timestamp.valueOf(seenAt),
            Date.valueOf(hideEndAt)
        );
    }

    @Override
    public int deleteUnseenBefore(PolicySource source, LocalDateTime cutoff) {
        return jdbcTemplate.update(DELETE_SQL, source.name(), Timestamp.valueOf(cutoff));
    }

    private static void setNullableString(PreparedStatement ps, int index, String value) throws SQLException {
        if (value == null || value.isBlank()) {
            ps.setNull(index, Types.VARCHAR);
        } else {
            ps.setString(index, value);
        }
    }

    private static void setNullableDate(PreparedStatement ps, int index, LocalDate value) throws SQLException {
        if (value == null) {
            ps.setNull(index, Types.DATE);
        } else {
            ps.setDate(index, Date.valueOf(value));
        }
    }
}
