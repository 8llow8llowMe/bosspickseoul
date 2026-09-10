package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Properties;
import org.hibernate.mapping.Table;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

/** 필터가 빗나가면 dev 의 ddl-auto 가 배치 소유 테이블을 다른 collation·FK 로 먼저 만들어 버린다. 순수 함수라 여기서 못 박는다. */
class DatasetSchemaFilterProviderTest {

    private final DatasetSchemaFilterProvider provider = new DatasetSchemaFilterProvider();

    @Test
    void excludesBatchOwnedDatasetTablesRegardlessOfCase() {
        assertThat(provider.getCreateFilter().includeTable(table("dataset_fact"))).isFalse();
        assertThat(provider.getMigrateFilter().includeTable(table("DATASET_ACTIVE_RELEASE"))).isFalse();
        assertThat(provider.getDropFilter().includeTable(table("dataset_spatial_area"))).isFalse();
    }

    @Test
    void keepsEveryOtherTable() {
        assertThat(provider.getCreateFilter().includeTable(table("change_commercial"))).isTrue();
        assertThat(provider.getMigrateFilter().includeTable(table("analysis_bookmark"))).isTrue();
        assertThat(provider.getValidateFilter().includeTable(table("my_dataset_view"))).as("접두가 아니면 제외하지 않는다").isTrue();
    }

    /**
     * Hibernate 는 이 프로퍼티의 클래스를 찾지 못하면 예외 없이 기본 필터로 조용히 폴백한다. 그러면 dev 의 ddl-auto 가
     * dataset_* 를 만들어 배치 DDL 과 어긋난다. yml 문자열과 클래스 이름이 같음을 테스트로 고정한다.
     */
    @Test
    void applicationYmlBindsThisClassAsTheSchemaFilterProvider() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties properties = yaml.getObject();

        assertThat(properties).isNotNull();
        assertThat(properties.getProperty("spring.jpa.properties.hibernate.hbm2ddl.schema_filter_provider"))
            .isEqualTo(DatasetSchemaFilterProvider.class.getName());
    }

    private static Table table(String name) {
        Table table = new Table("orm");
        table.setName(name);
        return table;
    }
}
