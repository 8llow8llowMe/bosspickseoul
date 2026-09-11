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
 *
 * <p>정책용 DataSource 를 빈으로 올리지 않는다. {@code DataSourceAutoConfiguration} 이
 * {@code @ConditionalOnMissingBean(DataSource.class)} 라서, 여기서 DataSource 빈을 하나라도 만들면
 * {@code spring.datasource.*} 로 만들어지던 기본 DataSource 가 사라진다. 그러면 이 설정이 주입받으려던
 * 기본 DataSource 후보가 자기 자신밖에 없어 순환 참조로 기동이 깨진다. 그래서 정책용 DataSource 는
 * 빈이 아니라 이 클래스가 들고 있는 객체로 만들고 JdbcTemplate 만 노출한다.
 */
@Configuration
@RequiredArgsConstructor
public class PolicyCommercialDataSourceConfig {

    private final PolicyIngestionProperties properties;
    private DataSource createdPolicyDataSource;

    @Bean(name = "policyJdbcTemplate")
    public JdbcTemplate policyJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(resolvePolicyDataSource(dataSource));
    }

    @Bean(name = "policyTransactionManager")
    public DataSourceTransactionManager policyTransactionManager(
        @Qualifier("policyJdbcTemplate") JdbcTemplate policyJdbcTemplate
    ) {
        return new DataSourceTransactionManager(policyJdbcTemplate.getDataSource());
    }

    /**
     * 정책 수집이 꺼져 있으면 기본 DataSource 를 그대로 쓴다. 켜져 있을 때만 commercial 스키마로 따로 연다.
     * 한 번 만든 것을 재사용해야 JdbcTemplate 과 트랜잭션 매니저가 같은 커넥션 풀을 본다.
     */
    private DataSource resolvePolicyDataSource(DataSource dataSource) {
        if (!properties.enabled()) {
            return dataSource;
        }
        if (createdPolicyDataSource == null) {
            PolicyIngestionProperties.Datasource datasource = properties.datasource();
            createdPolicyDataSource = DataSourceBuilder.create()
                .url(datasource.url())
                .username(datasource.username())
                .password(datasource.password())
                .driverClassName(datasource.driverClassName())
                .build();
        }
        return createdPolicyDataSource;
    }

    @PreDestroy
    void closeCreatedPolicyDataSource() throws Exception {
        if (createdPolicyDataSource instanceof Closeable closeable) {
            closeable.close();
        }
    }
}
