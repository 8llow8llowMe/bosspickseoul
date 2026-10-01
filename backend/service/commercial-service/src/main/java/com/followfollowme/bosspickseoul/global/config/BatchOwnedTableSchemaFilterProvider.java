package com.followfollowme.bosspickseoul.global.config;

import java.util.Locale;
import java.util.Set;
import org.hibernate.boot.model.relational.Namespace;
import org.hibernate.boot.model.relational.Sequence;
import org.hibernate.mapping.Table;
import org.hibernate.tool.schema.spi.SchemaFilter;
import org.hibernate.tool.schema.spi.SchemaFilterProvider;

/**
 * Hibernate 스키마 도구(ddl-auto create/update/validate)에서 <b>batch-service 가 DDL 을 소유하는 테이블</b>을 뺀다. (이슈 #415)
 *
 * <p>{@code pension_income_district} 는 런북 {@code scripts/migration/pension-income-district-table.sql} 로 만들고 batch-service 의
 * {@code --job=pension-income} 이 적재한다. 이 서비스는 읽기 전용 엔티티로 미러링만 하는데, dev/local 의 {@code ddl-auto: update}
 * 가 런북보다 먼저 돌면 엔티티 모양으로 테이블을 만들어 버린다. 컬럼 주석·{@code CHAR(64)}·{@code loaded_at} 기본값·유니크 키가
 * 런북과 다른 테이블이 생기고, 런북은 {@code IF NOT EXISTS} 라 그것을 고치지 않는다. (coding-conventions §9-1 예외)
 *
 * <p>등록은 {@code spring.jpa.properties.hibernate.hbm2ddl.schema_filter_provider} 다. 운영은 {@code ddl-auto: none} 이라 영향이
 * 없다. 실제 스키마 초기화 뒤 테이블이 없는지는 {@code PensionIncomeDistrictRepositoryTest} 가 H2 슬라이스에서 확인한다.
 */
public class BatchOwnedTableSchemaFilterProvider implements SchemaFilterProvider {

    /** 배치가 DDL 을 소유하는 테이블의 물리 이름. 이름이 정확히 같을 때만 뺀다(대소문자 무시). */
    public static final Set<String> EXCLUDED_TABLES = Set.of("pension_income_district");

    private static final SchemaFilter EXCLUDE_BATCH_OWNED_TABLES = new SchemaFilter() {
        @Override
        public boolean includeNamespace(Namespace namespace) {
            return true;
        }

        @Override
        public boolean includeTable(Table table) {
            return !EXCLUDED_TABLES.contains(table.getName().toLowerCase(Locale.ROOT));
        }

        @Override
        public boolean includeSequence(Sequence sequence) {
            return true;
        }
    };

    @Override
    public SchemaFilter getCreateFilter() {
        return EXCLUDE_BATCH_OWNED_TABLES;
    }

    @Override
    public SchemaFilter getDropFilter() {
        return EXCLUDE_BATCH_OWNED_TABLES;
    }

    @Override
    public SchemaFilter getTruncatorFilter() {
        return EXCLUDE_BATCH_OWNED_TABLES;
    }

    @Override
    public SchemaFilter getMigrateFilter() {
        return EXCLUDE_BATCH_OWNED_TABLES;
    }

    @Override
    public SchemaFilter getValidateFilter() {
        return EXCLUDE_BATCH_OWNED_TABLES;
    }
}
