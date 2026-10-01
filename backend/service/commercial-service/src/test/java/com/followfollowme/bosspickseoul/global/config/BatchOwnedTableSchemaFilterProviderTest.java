package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Properties;
import org.hibernate.mapping.Table;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

/**
 * 필터가 빗나가면 dev/local 의 {@code ddl-auto: update} 가 배치 소유 테이블을 런북과 다른 모양으로 먼저 만든다. (이슈 #415)
 *
 * <p>여기서는 판정과 등록 문자열만 본다. 실제 스키마 초기화 뒤 테이블이 정말 없는지는 {@code PensionIncomeDistrictRepositoryTest}
 * 가 H2 슬라이스에서 확인한다.
 */
class BatchOwnedTableSchemaFilterProviderTest {

    private final BatchOwnedTableSchemaFilterProvider provider = new BatchOwnedTableSchemaFilterProvider();

    @Test
    @DisplayName("배치가 DDL 을 소유하는 테이블은 대소문자와 무관하게 모든 스키마 도구에서 빠진다")
    void excludesBatchOwnedTablesRegardlessOfCase() {
        assertThat(provider.getCreateFilter().includeTable(table("pension_income_district"))).isFalse();
        assertThat(provider.getMigrateFilter().includeTable(table("PENSION_INCOME_DISTRICT"))).isFalse();
        assertThat(provider.getDropFilter().includeTable(table("pension_income_district"))).isFalse();
        assertThat(provider.getValidateFilter().includeTable(table("pension_income_district"))).isFalse();
        assertThat(provider.getTruncatorFilter().includeTable(table("pension_income_district"))).isFalse();
    }

    @Test
    @DisplayName("이 서비스가 ddl-auto 로 관리하는 나머지 테이블은 그대로 둔다")
    void keepsEveryOtherTable() {
        assertThat(provider.getCreateFilter().includeTable(table("income_district"))).isTrue();
        assertThat(provider.getMigrateFilter().includeTable(table("income_administration"))).isTrue();
        assertThat(provider.getMigrateFilter().includeTable(table("pension_income_district_backup")))
            .as("이름이 정확히 같을 때만 뺀다")
            .isTrue();
    }

    @Test
    @DisplayName("application.yml 이 이 클래스를 스키마 필터로 등록한다")
    void applicationYmlBindsThisClassAsTheSchemaFilterProvider() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("spring.jpa.properties.hibernate.hbm2ddl.schema_filter_provider"))
            .isEqualTo(BatchOwnedTableSchemaFilterProvider.class.getName());
    }

    private static Table table(String name) {
        Table table = new Table("orm");
        table.setName(name);
        return table;
    }
}
