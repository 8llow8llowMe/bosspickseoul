package com.followfollowme.bosspickseoul.domainlayer.member.adapter.out.persistence.entity;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.dialect.MySQLDialect;
import org.hibernate.tool.schema.spi.SchemaManagementToolCoordinator;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * {@link MemberConsentEntity} 가 prod 런북 DDL 과 같은 스키마를 만드는지 대조한다. (이슈 #494)
 *
 * <p>dev 는 {@code ddl-auto: update} 로 Hibernate 가 테이블을 만들고, prod 는 {@code ddl-auto: none} 이라 런북으로 만든다.
 * 둘이 어긋나면 prod 는 기동은 성공하고 첫 가입의 INSERT 에서야 터진다. 그래서 Hibernate 의 MySQL 방언이 실제로 내는
 * DDL(= dev 가 만드는 테이블)을 DB 연결 없이 뽑아, 런북 파일의 컬럼 이름·SQL 타입·길이·NOT NULL 과 맞춘다.
 */
class MemberConsentSchemaContractTest {

    private static final Path DDL = Path.of("..", "..", "scripts", "migration", "member-consent-table-runbook.sql");
    private static final String TABLE = "member_consent";
    private static final Pattern RUNBOOK_COLUMN = Pattern.compile(
        "^\\s*([a-z_]+)\\s+(VARCHAR\\(\\d+\\)|BIGINT|TIMESTAMP|DATETIME\\(6\\))\\s+(NOT NULL|NULL)?.*$");

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Hibernate MySQL 방언이 만드는 member_consent 컬럼이 런북과 이름·SQL 타입·길이·NOT NULL 까지 같다")
    void hibernateDdlMatchesTheRunbook() throws IOException {
        Map<String, Column> runbook = columnsOfRunbook();
        String generated = hibernateCreateTable();

        Map<String, Column> hibernate = new LinkedHashMap<>();
        for (String name : runbook.keySet()) {
            Matcher matcher = Pattern.compile("(?<![a-z_])" + name + "\\s+([a-zA-Z]+(?:\\(\\d+\\))?)(\\s+not null)?").matcher(generated);
            assertThat(matcher.find()).as("generated DDL has column %s: %s", name, generated).isTrue();
            hibernate.put(name, new Column(matcher.group(1).toUpperCase(Locale.ROOT), matcher.group(2) != null));
        }
        assertThat(hibernate).containsExactlyInAnyOrderEntriesOf(runbook);
        // 엔티티가 런북에 없는 컬럼을 더 갖고 있지 않은지도 본다.
        assertThat(Pattern.compile("(?<![a-z_])[a-z_]+ (?:bigint|varchar|datetime|TIMESTAMP|enum)\\b").matcher(generated).results().count())
            .as("generated column count: %s", generated)
            .isEqualTo(runbook.size());
    }

    @Test
    @DisplayName("consent_type 은 enum 이름 문자열을 VARCHAR 로 저장한다 — ORDINAL 이나 MySQL ENUM 이 끼어들지 않는다")
    void consentTypeIsAVarcharOfEnumNames() throws Exception {
        Field field = MemberConsentEntity.class.getDeclaredField("consentType");

        // ORDINAL 이면 prod VARCHAR 컬럼에 "0" 이 들어가도 컬럼 비교는 통과한다. 저장 형식을 어노테이션으로 고정한다.
        assertThat(field.getAnnotation(Enumerated.class)).isNotNull().extracting(Enumerated::value).isEqualTo(EnumType.STRING);
        assertThat(field.getAnnotation(JdbcTypeCode.class)).isNotNull().extracting(JdbcTypeCode::value).isEqualTo(SqlTypes.VARCHAR);
        // Hibernate 6 MySQL 방언은 @Enumerated(STRING) 만 있으면 enum('TERMS',...) 을 만든다. 실제 DDL 로 확인한다.
        assertThat(hibernateCreateTable()).containsPattern("consent_type varchar\\(30\\) not null").doesNotContain("enum(");
    }

    @Test
    @DisplayName("엔티티에 선언한 인덱스가 런북에 같은 이름·컬럼으로 있다")
    void runbookDeclaresTheEntityIndexes() throws IOException {
        String sql = Files.readString(DDL, StandardCharsets.UTF_8);
        Index[] indexes = MemberConsentEntity.class.getAnnotation(Table.class).indexes();

        assertThat(indexes).isNotEmpty();
        for (Index index : indexes) {
            String columns = String.join(", ", Arrays.stream(index.columnList().split(",")).map(c -> snakeCase(c.trim())).toList());
            assertThat(sql).contains("KEY " + index.name() + " (" + columns + ")");
        }
    }

    /**
     * dev 의 ddl-auto 와 같은 방언·명명 전략으로 CREATE TABLE 문을 뽑는다. DB 에 붙지 않도록 JDBC 메타데이터 조회를 끈다.
     * 명명 전략은 Spring Boot 기본값(camelCase → snake_case)과 같다.
     */
    private String hibernateCreateTable() throws IOException {
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
            .applySetting(AvailableSettings.DIALECT, MySQLDialect.class.getName())
            .applySetting(AvailableSettings.ALLOW_METADATA_ON_BOOT, false)
            .applySetting(AvailableSettings.PHYSICAL_NAMING_STRATEGY, CamelCaseToUnderscoresNamingStrategy.class.getName())
            .build();
        try {
            Metadata metadata = new MetadataSources(registry).addAnnotatedClass(MemberConsentEntity.class).buildMetadata();
            Path script = tempDir.resolve("member-consent-" + System.nanoTime() + ".sql");
            Map<String, Object> settings = new HashMap<>();
            settings.put(AvailableSettings.JAKARTA_HBM2DDL_DATABASE_ACTION, "none");
            settings.put(AvailableSettings.JAKARTA_HBM2DDL_SCRIPTS_ACTION, "create");
            settings.put(AvailableSettings.JAKARTA_HBM2DDL_SCRIPTS_CREATE_TARGET, script.toString());
            settings.put(AvailableSettings.HBM2DDL_DELIMITER, ";");
            settings.put(AvailableSettings.HBM2DDL_CHARSET_NAME, StandardCharsets.UTF_8.name());
            SchemaManagementToolCoordinator.process(metadata, registry, settings, null);
            String ddl = Files.readString(script, StandardCharsets.UTF_8);
            int start = ddl.indexOf("create table " + TABLE + " (");
            assertThat(start).as("hibernate creates %s: %s", TABLE, ddl).isNotNegative();
            return ddl.substring(start, ddl.indexOf(';', start));
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    /** 런북의 CREATE TABLE 블록에서 컬럼 정의 줄만 읽는다. 키 정의 줄은 대문자로 시작해 걸러진다. */
    private static Map<String, Column> columnsOfRunbook() throws IOException {
        String sql = Files.readString(DDL, StandardCharsets.UTF_8);
        int start = sql.indexOf("CREATE TABLE IF NOT EXISTS " + TABLE + " (");
        assertThat(start).as("runbook creates %s", TABLE).isNotNegative();
        int end = sql.indexOf(") ENGINE=", start);
        Map<String, Column> columns = new LinkedHashMap<>();
        for (String line : sql.substring(start, end).split("\\R")) {
            Matcher matcher = RUNBOOK_COLUMN.matcher(line.stripTrailing());
            if (matcher.matches()) {
                columns.put(matcher.group(1), new Column(matcher.group(2), "NOT NULL".equals(matcher.group(3))));
            }
        }
        assertThat(columns).as("runbook column lines").isNotEmpty();
        return columns;
    }

    private static String snakeCase(String camelCase) {
        return camelCase.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    private record Column(String sqlType, boolean notNull) {
    }
}
