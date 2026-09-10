package com.followfollowme.bosspickseoul.global.config;

import jakarta.annotation.PreDestroy;
import java.io.Closeable;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.util.StringUtils;

/**
 * policy 테이블은 commercial 스키마에 있다. 기본 {@code BATCH_DB_URL} 은 district 를 유지한다.
 */
@Configuration
public class PolicyCommercialDataSourceConfig {

    private DataSource createdPolicyDataSource;

    @Bean(name = "policyDataSource", destroyMethod = "")
    public DataSource policyDataSource(
        DataSource dataSource,
        @Value("${batch.policy.enabled:false}") boolean enabled,
        @Value("${batch.policy-datasource.url:}") String url,
        @Value("${batch.policy-datasource.username:}") String username,
        @Value("${batch.policy-datasource.password:}") String password,
        @Value("${batch.policy-datasource.driver-class-name:com.mysql.cj.jdbc.Driver}") String driverClassName
    ) {
        if (!enabled) {
            return dataSource;
        }
        if (!StringUtils.hasText(url)) {
            throw new IllegalStateException("COMMERCIAL_DB_URL is required when batch.policy.enabled=true");
        }
        DataSource created = DataSourceBuilder.create()
            .url(url)
            .username(username)
            .password(password)
            .driverClassName(driverClassName)
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
