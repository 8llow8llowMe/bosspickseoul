package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class PolicyCommercialDataSourceConfigTest {

    @Test
    void reusesPrimaryDataSourceWhenPolicyJobsAreOff() {
        DataSource primary = mock(DataSource.class);
        PolicyCommercialDataSourceConfig config = new PolicyCommercialDataSourceConfig(disabledProperties());

        assertThat(config.policyDataSource(primary)).isSameAs(primary);
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
            )
        );
    }
}
