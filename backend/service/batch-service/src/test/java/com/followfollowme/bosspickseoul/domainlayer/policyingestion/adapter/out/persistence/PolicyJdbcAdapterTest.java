package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model.PolicyUpsert;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.domain.enums.PolicySource;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class PolicyJdbcAdapterTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private SnowflakeIdGenerator snowflake;

    private PolicyJdbcAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new PolicyJdbcAdapter(jdbc, snowflake);
    }

    @Test
    void upsertsWithSourceExternalIdAndDoesNotUpdateIdOnDuplicate() {
        when(jdbc.batchUpdate(any(String.class), any(BatchPreparedStatementSetter.class))).thenReturn(new int[] {1});

        adapter.upsertAll(
            PolicySource.BIZINFO,
            List.of(new PolicyUpsert(
                "PBLN_1", "제목", "기관", "SUBSIDY", "대상", "내용",
                null, null, LocalDate.of(2026, 3, 1), null, "https://example.test"
            )),
            LocalDateTime.of(2026, 9, 10, 6, 0)
        );

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).batchUpdate(sql.capture(), any(BatchPreparedStatementSetter.class));
        assertThat(sql.getValue()).contains("ON DUPLICATE KEY UPDATE");
        assertThat(sql.getValue()).doesNotContain("id = VALUES(id)");
        assertThat(sql.getValue()).contains("source, external_id, last_seen_at");
    }

    @Test
    void staleMarkOnlyTouchesUnseenRowsOfTheGivenSource() {
        when(jdbc.update(anyString(), any(), any(), any(), any())).thenReturn(2);

        int updated = adapter.staleMarkUnseen(
            PolicySource.BIZINFO,
            LocalDateTime.of(2026, 9, 10, 6, 0),
            LocalDate.of(2026, 9, 9)
        );

        assertThat(updated).isEqualTo(2);
        verify(jdbc).update(
            contains("last_seen_at <"),
            eq(Date.valueOf(LocalDate.of(2026, 9, 9))),
            eq("BIZINFO"),
            eq(Timestamp.valueOf(LocalDateTime.of(2026, 9, 10, 6, 0))),
            eq(Date.valueOf(LocalDate.of(2026, 9, 9)))
        );
    }

    @Test
    void purgeDeletesUnseenBizinfoRowsBeforeCutoff() {
        Timestamp cutoff = Timestamp.valueOf(LocalDateTime.of(2026, 8, 11, 0, 0));
        when(jdbc.update(contains("DELETE FROM policy"), eq("BIZINFO"), eq(cutoff))).thenReturn(3);

        assertThat(adapter.deleteUnseenBefore(PolicySource.BIZINFO, LocalDateTime.of(2026, 8, 11, 0, 0)))
            .isEqualTo(3);
        verify(jdbc).update(contains("DELETE FROM policy"), eq("BIZINFO"), eq(cutoff));
    }
}
