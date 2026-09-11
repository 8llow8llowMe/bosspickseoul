package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

public class ChangeCommercialProjectionJdbcAdapter implements TypedFactProjectionPort {

    private static final TypeReference<Map<String, String>> PAYLOAD = new TypeReference<>() {};

    private static final Map<Dataset, String> DELETE_SQL = new EnumMap<>(Dataset.class);
    private static final Map<Dataset, String> INSERT_SQL = new EnumMap<>(Dataset.class);

    static {
        DELETE_SQL.put(Dataset.FOOT_TRAFFIC_COMMERCIAL,
            "DELETE FROM foot_traffic_commercial WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.POPULATION_COMMERCIAL,
            "DELETE FROM population_commercial WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.FACILITY_COMMERCIAL,
            "DELETE FROM facility_commercial WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.CONSUMPTION_COMMERCIAL,
            "DELETE FROM income_commercial WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.STORE_COMMERCIAL,
            "DELETE FROM store_commercial WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.SALES_COMMERCIAL,
            "DELETE FROM sales_commercial WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.FOOT_TRAFFIC_DISTRICT,
            "DELETE FROM foot_traffic_district WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.CONSUMPTION_DISTRICT,
            "DELETE FROM income_district WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.CHANGE_DISTRICT,
            "DELETE FROM change_district WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.STORE_DISTRICT,
            "DELETE FROM store_district WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.SALES_DISTRICT,
            "DELETE FROM sales_district WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.CONSUMPTION_ADMINISTRATION,
            "DELETE FROM income_administration WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.STORE_ADMINISTRATION,
            "DELETE FROM store_administration WHERE period_code=? AND spatial_version=?");
        DELETE_SQL.put(Dataset.SALES_ADMINISTRATION,
            "DELETE FROM sales_administration WHERE period_code=? AND spatial_version=?");

        INSERT_SQL.put(Dataset.FOOT_TRAFFIC_COMMERCIAL, """
            INSERT INTO foot_traffic_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              total_foot_traffic, male_foot_traffic, female_foot_traffic,
              age10_foot_traffic, age20_foot_traffic, age30_foot_traffic, age40_foot_traffic,
              age50_foot_traffic, age60_plus_foot_traffic,
              foot_traffic_time_00_06, foot_traffic_time_06_11, foot_traffic_time_11_14,
              foot_traffic_time_14_17, foot_traffic_time_17_21, foot_traffic_time_21_24,
              monday_foot_traffic, tuesday_foot_traffic, wednesday_foot_traffic, thursday_foot_traffic,
              friday_foot_traffic, saturday_foot_traffic, sunday_foot_traffic)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.POPULATION_COMMERCIAL, """
            INSERT INTO population_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              total_resident_population, male_resident_population, female_resident_population,
              age10_resident_population, age20_resident_population, age30_resident_population,
              age40_resident_population, age50_resident_population, age60_plus_resident_population)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.FACILITY_COMMERCIAL, """
            INSERT INTO facility_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              total_facility_count, elementary_school_count, middle_school_count, high_school_count,
              university_count, subway_station_count, bus_stop_count)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.CONSUMPTION_COMMERCIAL, """
            INSERT INTO income_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              monthly_average_income_amount, income_bracket_code, total_expense_amount,
              grocery_expense_amount, clothing_expense_amount, medical_expense_amount,
              household_expense_amount, transportation_expense_amount, leisure_expense_amount,
              culture_expense_amount, education_expense_amount, entertainment_expense_amount)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.STORE_COMMERCIAL, """
            INSERT INTO store_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              service_code, service_name, service_type,
              total_store_count, similar_store_count, opening_rate, opened_store_count,
              closure_rate, closed_store_count, franchise_store_count)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.SALES_COMMERCIAL, """
            INSERT INTO sales_commercial (
              period_code, spatial_version, commercial_code,
              commercial_classification_code, commercial_classification_name, commercial_name,
              service_code, service_name, service_type,
              monthly_sales_amount,
              monday_sales_amount, tuesday_sales_amount, wednesday_sales_amount, thursday_sales_amount,
              friday_sales_amount, saturday_sales_amount, sunday_sales_amount,
              sales_amount_time_00_06, sales_amount_time_06_11, sales_amount_time_11_14,
              sales_amount_time_14_17, sales_amount_time_17_21, sales_amount_time_21_24,
              male_sales_amount, female_sales_amount,
              age10_sales_amount, age20_sales_amount, age30_sales_amount, age40_sales_amount,
              age50_sales_amount, age60_plus_sales_amount,
              monday_sales_count, tuesday_sales_count, wednesday_sales_count, thursday_sales_count,
              friday_sales_count, saturday_sales_count, sunday_sales_count,
              sales_count_time_00_06, sales_count_time_06_11, sales_count_time_11_14,
              sales_count_time_14_17, sales_count_time_17_21, sales_count_time_21_24,
              male_sales_count, female_sales_count)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.FOOT_TRAFFIC_DISTRICT, """
            INSERT INTO foot_traffic_district (
              period_code, spatial_version, district_code, district_name,
              total_foot_traffic, male_foot_traffic, female_foot_traffic,
              age10_foot_traffic, age20_foot_traffic, age30_foot_traffic, age40_foot_traffic,
              age50_foot_traffic, age60_plus_foot_traffic,
              foot_traffic_time_00_06, foot_traffic_time_06_11, foot_traffic_time_11_14,
              foot_traffic_time_14_17, foot_traffic_time_17_21, foot_traffic_time_21_24,
              monday_foot_traffic, tuesday_foot_traffic, wednesday_foot_traffic, thursday_foot_traffic,
              friday_foot_traffic, saturday_foot_traffic, sunday_foot_traffic)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.CONSUMPTION_DISTRICT, """
            INSERT INTO income_district (
              period_code, spatial_version, district_code, district_name, total_expense_amount)
            VALUES (?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.CHANGE_DISTRICT, """
            INSERT INTO change_district (
              period_code, spatial_version, district_code, district_name,
              change_indicator_code, change_indicator_name, average_opened_months, average_closed_months)
            VALUES (?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.STORE_DISTRICT, """
            INSERT INTO store_district (
              period_code, spatial_version, district_code, district_name,
              service_code, service_name, service_type,
              total_store_count, similar_store_count, opened_store_count, closed_store_count,
              franchise_store_count, opening_rate, closure_rate)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.SALES_DISTRICT, """
            INSERT INTO sales_district (
              period_code, spatial_version, district_code, district_name,
              service_code, service_name, service_type,
              monthly_sales_amount,
              monday_sales_amount, tuesday_sales_amount, wednesday_sales_amount, thursday_sales_amount,
              friday_sales_amount, saturday_sales_amount, sunday_sales_amount,
              sales_amount_time_00_06, sales_amount_time_06_11, sales_amount_time_11_14,
              sales_amount_time_14_17, sales_amount_time_17_21, sales_amount_time_21_24,
              male_sales_amount, female_sales_amount,
              age10_sales_amount, age20_sales_amount, age30_sales_amount, age40_sales_amount,
              age50_sales_amount, age60_plus_sales_amount)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.CONSUMPTION_ADMINISTRATION, """
            INSERT INTO income_administration (
              period_code, spatial_version, administration_code, administration_name, total_expense_amount)
            VALUES (?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.STORE_ADMINISTRATION, """
            INSERT INTO store_administration (
              period_code, spatial_version, administration_code, administration_name,
              service_code, service_name, service_type,
              total_store_count, similar_store_count, opened_store_count, closed_store_count,
              franchise_store_count, opening_rate, closure_rate)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """);
        INSERT_SQL.put(Dataset.SALES_ADMINISTRATION, """
            INSERT INTO sales_administration (
              period_code, spatial_version, administration_code, administration_name,
              service_code, service_name, service_type,
              monthly_sales_amount, weekday_sales_amount, weekend_sales_amount)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            """);
    }

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

    @Override
    @Transactional
    public int replaceTyped(ProjectionRequest request, List<Object[]> rows) {
        String deleteSql = DELETE_SQL.get(request.dataset());
        String insertSql = INSERT_SQL.get(request.dataset());
        if (deleteSql == null || insertSql == null) {
            throw new IllegalArgumentException("typed projection SQL missing for " + request.dataset());
        }
        jdbc.update(deleteSql, request.period().value(), request.spatialVersion());
        jdbc.batchUpdate(insertSql, rows, 500, this::bindTyped);
        return rows.size();
    }

    private void bindTyped(PreparedStatement statement, Object[] row) throws SQLException {
        for (int index = 0; index < row.length; index++) {
            statement.setObject(index + 1, row[index]);
        }
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
