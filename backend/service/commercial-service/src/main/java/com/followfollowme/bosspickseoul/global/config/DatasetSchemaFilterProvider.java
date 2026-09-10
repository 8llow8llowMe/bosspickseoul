package com.followfollowme.bosspickseoul.global.config;

import org.hibernate.boot.model.relational.Namespace;
import org.hibernate.boot.model.relational.Sequence;
import org.hibernate.mapping.Table;
import org.hibernate.tool.schema.spi.SchemaFilter;
import org.hibernate.tool.schema.spi.SchemaFilterProvider;

/**
 * Hibernate 스키마 도구(ddl-auto update/create)에서 {@code dataset_} 접두 테이블을 제외한다.
 *
 * <p>{@code dataset_fact} 등은 batch-service 가 {@code quarterly-dataset-schema.sql} 로 만들고 소유한다. 이 서비스는 읽기용
 * 엔티티로 미러링만 하는데, dev/local 의 {@code ddl-auto: update} 가 그 엔티티로 FK·collation 이 다른 테이블을 먼저 만들어
 * 버리면 배치 DDL 과 어긋난다. 등록은 {@code spring.jpa.properties.hibernate.hbm2ddl.schema_filter_provider} 다.
 */
public class DatasetSchemaFilterProvider implements SchemaFilterProvider {

    static final String EXCLUDED_TABLE_PREFIX = "dataset_";

    private static final SchemaFilter EXCLUDE_DATASET_TABLES = new SchemaFilter() {
        @Override
        public boolean includeNamespace(Namespace namespace) {
            return true;
        }

        @Override
        public boolean includeTable(Table table) {
            return !table.getName().toLowerCase().startsWith(EXCLUDED_TABLE_PREFIX);
        }

        @Override
        public boolean includeSequence(Sequence sequence) {
            return true;
        }
    };

    @Override
    public SchemaFilter getCreateFilter() {
        return EXCLUDE_DATASET_TABLES;
    }

    @Override
    public SchemaFilter getDropFilter() {
        return EXCLUDE_DATASET_TABLES;
    }

    @Override
    public SchemaFilter getTruncatorFilter() {
        return EXCLUDE_DATASET_TABLES;
    }

    @Override
    public SchemaFilter getMigrateFilter() {
        return EXCLUDE_DATASET_TABLES;
    }

    @Override
    public SchemaFilter getValidateFilter() {
        return EXCLUDE_DATASET_TABLES;
    }
}
