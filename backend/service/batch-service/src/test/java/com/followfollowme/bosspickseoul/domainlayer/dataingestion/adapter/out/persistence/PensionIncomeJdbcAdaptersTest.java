package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeDistrictRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSnapshot;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ParameterizedPreparedStatementSetter;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.annotation.Transactional;

/**
 * 국민연금 자치구 평균소득의 자치구 대조·교체 쓰기. 다른 JDBC 어댑터 테스트처럼 실제 DB 없이 문장과 바인딩을 대조한다.
 * MySQL 실행은 마이그레이션 스크립트 끝의 확인 SQL 로 개발 DB 에서 본다.
 */
class PensionIncomeJdbcAdaptersTest {

    private static final Instant SOURCE_UPDATED_AT = Instant.parse("2025-01-31T00:00:00Z");

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test
    void districtLookupReadsOnlyDistrictsOfAReadySnapshot() throws Exception {
        String sql = DistrictCodeLookupJdbcAdapter.DISTRICT_CODES_SQL.replaceAll("\\s+", " ");
        assertThat(sql).contains("JOIN dataset_spatial_release r ON r.spatial_version=a.spatial_version AND r.status='READY'")
            .contains("WHERE a.spatial_version=? AND a.area_type=?");
        stubDistricts(new String[][] {{"11110", "종로구"}, {"11140", "중구"}});

        assertThat(new DistrictCodeLookupJdbcAdapter(jdbc).districtCodesByName("legacy-20233"))
            .containsExactlyInAnyOrderEntriesOf(Map.of("종로구", "11110", "중구", "11140"));
        verify(jdbc).query(eq(DistrictCodeLookupJdbcAdapter.DISTRICT_CODES_SQL), any(RowMapper.class), eq("legacy-20233"), eq("DISTRICT"));
    }

    @Test
    void duplicateDistrictNamesInTheSnapshotStopTheLookup() throws Exception {
        stubDistricts(new String[][] {{"11140", "중구"}, {"11999", "중구"}});

        assertThatThrownBy(() -> new DistrictCodeLookupJdbcAdapter(jdbc).districtCodesByName("legacy-20233"))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("Duplicate DISTRICT area_name").hasMessageContaining("중구");
    }

    @Test
    @SuppressWarnings("unchecked")
    void replaceDeletesEveryReferenceDateOfTheSnapshotThenInsertsItsRows() throws Exception {
        PensionIncomeDistrictRow jongno2023 = new PensionIncomeDistrictRow(LocalDate.of(2023, 12, 31), "11110", "종로구", "서울특별시종로구", 1_478_370L);
        PensionIncomeDistrictRow jongno2024 = new PensionIncomeDistrictRow(LocalDate.of(2024, 12, 31), "11110", "종로구", "서울특별시종로구", 1_555_244L);
        PensionIncomeSnapshot snapshot = new PensionIncomeSnapshot("pension-2024-002", "c".repeat(64), SOURCE_UPDATED_AT, List.of(jongno2023, jongno2024));

        int written = new PensionIncomeDistrictJdbcAdapter(jdbc).replace(snapshot);

        assertThat(written).isEqualTo(2);
        ArgumentCaptor<Collection<PensionIncomeDistrictRow>> rows = ArgumentCaptor.forClass(Collection.class);
        ArgumentCaptor<ParameterizedPreparedStatementSetter<PensionIncomeDistrictRow>> setter =
            ArgumentCaptor.forClass(ParameterizedPreparedStatementSetter.class);
        InOrder order = inOrder(jdbc);
        order.verify(jdbc).update("DELETE FROM pension_income_district WHERE reference_date IN (?,?)",
            Date.valueOf("2023-12-31"), Date.valueOf("2024-12-31"));
        order.verify(jdbc).batchUpdate(eq(PensionIncomeDistrictJdbcAdapter.INSERT_SQL), rows.capture(), anyInt(), setter.capture());
        assertThat(rows.getValue()).containsExactly(jongno2023, jongno2024);

        PreparedStatement statement = mock(PreparedStatement.class);
        setter.getValue().setValues(statement, jongno2024);
        verify(statement).setDate(1, Date.valueOf("2024-12-31"));
        verify(statement).setString(2, "11110");
        verify(statement).setString(3, "종로구");
        verify(statement).setString(4, "서울특별시종로구");
        verify(statement).setLong(5, 1_555_244L);
        verify(statement).setTimestamp(6, Timestamp.from(SOURCE_UPDATED_AT));
        verify(statement).setString(7, "c".repeat(64));
        verify(statement).setString(8, "pension-2024-002");
    }

    @Test
    void deleteAndInsertShareOneCommercialTransactionAndTheInsertBindsEveryColumn() throws Exception {
        Transactional transactional = AnnotationUtils.findAnnotation(
            PensionIncomeDistrictJdbcAdapter.class.getMethod("replace", PensionIncomeSnapshot.class), Transactional.class);
        assertThat(transactional.value()).isEqualTo("commercialTransactionManager");
        assertThat(PensionIncomeDistrictJdbcAdapter.INSERT_SQL.chars().filter(c -> c == '?').count()).isEqualTo(8);
        assertThat(PensionIncomeDistrictJdbcAdapter.deleteSql(1)).isEqualTo("DELETE FROM pension_income_district WHERE reference_date IN (?)");
    }

    @SuppressWarnings("unchecked")
    private void stubDistricts(String[][] districts) throws Exception {
        when(jdbc.query(eq(DistrictCodeLookupJdbcAdapter.DISTRICT_CODES_SQL), any(RowMapper.class), any(), any())).thenAnswer(invocation -> {
            RowMapper<String[]> mapper = invocation.getArgument(1);
            List<String[]> mapped = new ArrayList<>();
            for (String[] district : districts) {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getString("area_code")).thenReturn(district[0]);
                when(rs.getString("area_name")).thenReturn(district[1]);
                mapped.add(mapper.mapRow(rs, mapped.size()));
            }
            return mapped;
        });
    }
}
