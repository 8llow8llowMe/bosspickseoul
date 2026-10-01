package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.entity;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 읽기 전용 엔티티가 배치 소유 런북 DDL 을 그대로 미러링하는지 대조한다. (이슈 #415)
 *
 * <p>운영은 {@code ddl-auto: none} 이고 스키마 필터가 validate 도 건너뛰므로, 엔티티가 런북과 어긋나도 기동은 성공하고 첫
 * {@code /income} 요청에서 SQL 오류로 터진다. H2 슬라이스는 테스트가 직접 만든 테이블에 질의할 뿐이라 이 드리프트를 못 잡는다.
 * 그래서 런북 파일을 직접 읽어 컬럼 이름·문자열 길이·NOT NULL 을 어노테이션과 맞춘다.
 */
class PensionIncomeDistrictSchemaContractTest {

    private static final Path DDL = Path.of("..", "..", "scripts", "migration", "pension-income-district-table.sql");
    private static final String TABLE = "pension_income_district";
    private static final Pattern COLUMN = Pattern.compile(
        "^\\s*([a-z_]+)\\s+(VARCHAR\\((\\d+)\\)|CHAR\\((\\d+)\\)|BIGINT|TIMESTAMP\\(6\\)|DATE)(\\s.*|,)?$");

    @Test
    @DisplayName("런북에 조회용 유니크 키가 district_code, reference_date 순서로 있다")
    void runbookKeepsTheLookupUniqueKeyInOrder() throws IOException {
        assertThat(Files.readString(DDL, StandardCharsets.UTF_8))
            .contains("UNIQUE KEY uk_pension_income_district_district_code_reference_date (district_code, reference_date)");
    }

    @Test
    @DisplayName("pension_income_district 컬럼이 런북과 이름·SQL 타입·길이·NOT NULL 까지 같다")
    void entityMirrorsTheRunbookDdl() throws IOException {
        assertThat(columnsOfEntity()).containsExactlyInAnyOrderEntriesOf(columnsOfDdl());
    }

    /** 런북의 CREATE TABLE 블록에서 컬럼 정의 줄만 읽는다. 키 정의·COMMENT 줄은 대문자로 시작해 걸러진다. */
    private static Map<String, DdlColumn> columnsOfDdl() throws IOException {
        String sql = Files.readString(DDL, StandardCharsets.UTF_8);
        int start = sql.indexOf("CREATE TABLE IF NOT EXISTS " + TABLE + " (");
        assertThat(start).as("runbook creates %s", TABLE).isNotNegative();
        int end = sql.indexOf(") ENGINE=", start);
        Map<String, DdlColumn> columns = new LinkedHashMap<>();
        for (String line : sql.substring(start, end).split("\\R")) {
            Matcher matcher = COLUMN.matcher(line.stripTrailing());
            if (!matcher.matches()) {
                continue;
            }
            Integer length = matcher.group(3) != null ? Integer.valueOf(matcher.group(3))
                : matcher.group(4) != null ? Integer.valueOf(matcher.group(4)) : null;
            String rest = matcher.group(5) == null ? "" : matcher.group(5);
            String sqlType = matcher.group(2).startsWith("VARCHAR") || matcher.group(2).startsWith("CHAR") ? "STRING" : matcher.group(2);
            columns.put(matcher.group(1), new DdlColumn(sqlType, length, rest.contains("NOT NULL")));
        }
        assertThat(columns).as("runbook column lines").isNotEmpty();
        return columns;
    }

    /** 엔티티 필드를 물리 이름(snake_case)으로 읽는다. 길이는 문자열 컬럼만 본다. {@code @Id} 는 NOT NULL 이다. */
    private static Map<String, DdlColumn> columnsOfEntity() {
        Map<String, DdlColumn> columns = new LinkedHashMap<>();
        for (Field field : PensionIncomeDistrictEntity.class.getDeclaredFields()) {
            Column column = field.getAnnotation(Column.class);
            boolean id = field.isAnnotationPresent(Id.class);
            if (column == null && !id) {
                continue;
            }
            Integer length = field.getType() == String.class && column != null ? column.length() : null;
            boolean notNull = id || !column.nullable();
            columns.put(snakeCase(field.getName()), new DdlColumn(sqlTypeOf(field.getType()), length, notNull));
        }
        return columns;
    }

    /** 엔티티 Java 타입을 런북 SQL 타입으로 옮기는 대응표. 표에 없는 타입은 비교에서 걸리도록 클래스 이름을 그대로 둔다. */
    private static String sqlTypeOf(Class<?> type) {
        if (type == LocalDate.class) {
            return "DATE";
        }
        if (type == LocalDateTime.class) {
            return "TIMESTAMP(6)";
        }
        if (type == Long.class || type == long.class) {
            return "BIGINT";
        }
        if (type == String.class) {
            return "STRING";
        }
        return type.getName();
    }

    private static String snakeCase(String camelCase) {
        return camelCase.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    private record DdlColumn(String sqlType, Integer length, boolean notNull) {
    }
}
