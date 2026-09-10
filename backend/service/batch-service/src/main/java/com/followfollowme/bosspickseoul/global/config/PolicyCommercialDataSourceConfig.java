package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import jakarta.annotation.PreDestroy;
import java.io.Closeable;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

/**
 * policy 테이블은 commercial 스키마에 있다. 기본 {@code BATCH_DB_URL} 은 district 를 유지한다.
 */
@Configuration
@RequiredArgsConstructor
public class PolicyCommercialDataSourceConfig {

    private final PolicyIngestionProperties properties;
    private DataSource createdPolicyDataSource;

    @Bean(name = "policyDataSource", destroyMethod = "")
    public DataSource policyDataSource(DataSource dataSource) {
        if (!properties.enabled()) {
            return dataSource;
        }
        PolicyIngestionProperties.Datasource datasource = properties.datasource();
        DataSource created = DataSourceBuilder.create()
            .url(datasource.url())
            .username(datasource.username())
            .password(datasource.password())
            .driverClassName(datasource.driverClassName())
            .build();
        this.createdPolicyDataSource = created;
        return created;
    }

    @Bean(name = "policyJdbcTemplate")
    public JdbcTemplate policyJdbcTemplate(@Qualifier("policyDataSource") DataSource policyDataSource) {
        return new JdbcTemplate(policyDataSource);
    }

    @Bean(name = "policyTransactionManager")
    public DataSourceTransactionManager policyTransactionManager(
        @Qualifier("policyDataSource") DataSource policyDataSource
    ) {
        return new DataSourceTransactionManager(policyDataSource);
    }

    @PreDestroy
    void closeCreatedPolicyDataSource() throws Exception {
        if (createdPolicyDataSource instanceof Closeable closeable) {
            closeable.close();
        }
    }
}
