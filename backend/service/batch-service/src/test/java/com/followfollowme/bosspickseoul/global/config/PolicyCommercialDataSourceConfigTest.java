package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class PolicyCommercialDataSourceConfigTest {

    @Test
    @DisplayName("정책 수집이 꺼져 있으면 기본 DataSource 를 그대로 쓴다")
    void reusesPrimaryDataSourceWhenPolicyJobsAreOff() {
        DataSource primary = mock(DataSource.class);
        PolicyCommercialDataSourceConfig config = new PolicyCommercialDataSourceConfig(disabledProperties());

        assertThat(config.policyJdbcTemplate(primary).getDataSource()).isSameAs(primary);
    }

    @Test
    @DisplayName("트랜잭션 매니저가 JdbcTemplate 과 같은 DataSource 를 본다")
    void transactionManagerSharesTheJdbcTemplateDataSource() {
        DataSource primary = mock(DataSource.class);
        PolicyCommercialDataSourceConfig config = new PolicyCommercialDataSourceConfig(disabledProperties());

        JdbcTemplate policyJdbcTemplate = config.policyJdbcTemplate(primary);

        assertThat(config.policyTransactionManager(policyJdbcTemplate).getDataSource()).isSameAs(primary);
    }

    private static PolicyIngestionProperties disabledProperties() {
        return new PolicyIngestionProperties(
            false, "0 0 6 * * ?", "0 30 6 * * ?", 0.5, 30,
            new PolicyIngestionProperties.Bizinfo(
                "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
                "key",
                "소상공인",
                100,
                20,
                30,
                3
            ),
            null
        );
    }
}
