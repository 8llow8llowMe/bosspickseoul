package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeDistrictRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeDistrictBulkPort;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Collections;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@code pension_income_district} 교체 쓰기(이슈 #415). DDL 은 {@code scripts/migration/pension-income-district-table.sql} 이고 앱이 만들지 않는다.
 * {@code QuarterlyImportConfig} 가 {@code commercialJdbcTemplate} 으로 조립하고, 트랜잭션은 같은 매니저를 이름으로 고른다.
 */
public class PensionIncomeDistrictJdbcAdapter implements PensionIncomeDistrictBulkPort {

    static final String INSERT_SQL = """
        INSERT INTO pension_income_district (
          reference_date, district_code, district_name, source_region_name, average_monthly_income_amount,
          source_updated_at, source_checksum, run_id)
        VALUES (?,?,?,?,?,?,?,?)
        """;

    private final JdbcTemplate jdbc;

    public PensionIncomeDistrictJdbcAdapter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional("commercialTransactionManager")
    public int replace(PensionIncomeSnapshot snapshot) {
        List<Date> referenceDates = snapshot.referenceDates().stream().map(Date::valueOf).toList();
        jdbc.update(deleteSql(referenceDates.size()), referenceDates.toArray());
        Timestamp sourceUpdatedAt = Timestamp.from(snapshot.sourceUpdatedAt());
        jdbc.batchUpdate(INSERT_SQL, snapshot.rows(), 500, (statement, row) -> bind(statement, row, snapshot, sourceUpdatedAt));
        return snapshot.rows().size();
    }

    /**
     * 자리표시자 수만 기준일 수에서 온다. 값은 바인딩한다. 테이블이 연 25행 × 몇 해 규모라 유니크 키 선두(district_code)를 못 타는
     * 이 DELETE 가 테이블 전체를 훑어도 문제가 없다.
     */
    static String deleteSql(int referenceDates) {
        return "DELETE FROM pension_income_district WHERE reference_date IN (" + String.join(",", Collections.nCopies(referenceDates, "?")) + ")";
    }

    private static void bind(PreparedStatement statement, PensionIncomeDistrictRow row, PensionIncomeSnapshot snapshot,
                             Timestamp sourceUpdatedAt) throws SQLException {
        statement.setDate(1, Date.valueOf(row.referenceDate()));
        statement.setString(2, row.districtCode());
        statement.setString(3, row.districtName());
        statement.setString(4, row.sourceRegionName());
        statement.setLong(5, row.averageMonthlyIncomeAmount());
        statement.setTimestamp(6, sourceUpdatedAt);
        statement.setString(7, snapshot.sourceChecksum());
        statement.setString(8, snapshot.runId());
    }
}
