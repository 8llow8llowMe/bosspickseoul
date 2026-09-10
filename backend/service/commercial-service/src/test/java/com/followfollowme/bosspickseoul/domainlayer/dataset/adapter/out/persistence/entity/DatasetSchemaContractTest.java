package com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Column;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 읽기 전용 엔티티가 배치 소유 DDL({@code quarterly-dataset-schema.sql})을 그대로 미러링하는지 대조한다.
 *
 * <p>H2 슬라이스는 엔티티가 만든 스키마에 엔티티로 왕복하는 것뿐이라 DDL 과의 드리프트를 잡지 못하고, 운영은 {@code ddl-auto: none}
 * 이며 스키마 필터가 validate 도 건너뛴다. 그래서 DDL 파일을 직접 파싱해 컬럼 이름·길이·NOT NULL 을 어노테이션과 맞춘다.
 */
class DatasetSchemaContractTest {

    private static final Path DDL = Path.of("..", "..", "scripts", "migration", "quarterly-dataset-schema.sql");
    private static final Pattern COLUMN = Pattern.compile("^\\s*([a-z_]+)\\s+(VARCHAR\\((\\d+)\\)|CHAR\\((\\d+)\\)|JSON|TEXT|BIGINT|TIMESTAMP\\(6\\))(.*)$");

    @Test
    @DisplayName("dataset_fact 컬럼이 DDL 과 이름·길이·NOT NULL 까지 같다")
    void datasetFactMirrorsTheDdl() throws IOException {
        Map<String, DdlColumn> ddl = columnsOf("dataset_fact");
        Map<String, DdlColumn> entity = new LinkedHashMap<>();
        entity.putAll(columnsOf(DatasetFactId.class, true));
        entity.putAll(columnsOf(DatasetFactEntity.class, false));

        assertThat(entity).containsExactlyInAnyOrderEntriesOf(ddl);
    }

    @Test
    @DisplayName("dataset_active_release 컬럼이 DDL 과 이름·길이·NOT NULL 까지 같다")
    void datasetActiveReleaseMirrorsTheDdl() throws IOException {
        Map<String, DdlColumn> ddl = columnsOf("dataset_active_release");
        Map<String, DdlColumn> entity = new LinkedHashMap<>();
        entity.putAll(columnsOf(DatasetActiveReleaseId.class, true));
        entity.putAll(columnsOf(DatasetActiveReleaseEntity.class, false));

        assertThat(entity).containsExactlyInAnyOrderEntriesOf(ddl);
    }

    /** DDL 의 CREATE TABLE 블록에서 컬럼 정의 줄만 읽는다. PK 컬럼은 NOT NULL 로 본다. */
    private static Map<String, DdlColumn> columnsOf(String table) throws IOException {
        String sql = Files.readString(DDL);
        int start = sql.indexOf("CREATE TABLE IF NOT EXISTS " + table + " (");
        assertThat(start).as("DDL has %s", table).isNotNegative();
        int end = sql.indexOf(") ENGINE=", start);
        Map<String, DdlColumn> columns = new LinkedHashMap<>();
        for (String line : sql.substring(start, end).split("\n")) {
            Matcher matcher = COLUMN.matcher(line.stripTrailing());
            if (!matcher.matches()) {
                continue;
            }
            String rest = matcher.group(5);
            Integer length = matcher.group(3) != null ? Integer.valueOf(matcher.group(3))
                : matcher.group(4) != null ? Integer.valueOf(matcher.group(4)) : null;
            boolean notNull = rest.contains("NOT NULL") || rest.contains("PRIMARY KEY");
            columns.put(matcher.group(1), new DdlColumn(length, notNull));
        }
        return columns;
    }

    /** 엔티티 필드의 @Column 을 읽는다. 임베디드 키의 컬럼은 PK 라 항상 NOT NULL 이다. */
    private static Map<String, DdlColumn> columnsOf(Class<?> type, boolean primaryKey) {
        Map<String, DdlColumn> columns = new LinkedHashMap<>();
        for (Field field : type.getDeclaredFields()) {
            Column column = field.getAnnotation(Column.class);
            if (column == null) {
                continue;
            }
            boolean sized = field.getType() == String.class;
            columns.put(snake(field.getName()), new DdlColumn(sized ? column.length() : null, primaryKey || !column.nullable()));
        }
        return columns;
    }

    private static String snake(String camel) {
        return camel.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(java.util.Locale.ROOT);
    }

    private record DdlColumn(Integer length, boolean notNull) {
    }
}
