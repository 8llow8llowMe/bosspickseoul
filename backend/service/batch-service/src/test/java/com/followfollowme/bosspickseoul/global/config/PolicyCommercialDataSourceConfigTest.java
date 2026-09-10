package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class PolicyCommercialDataSourceConfigTest {

    @Test
    void reusesPrimaryDataSourceWhenPolicyJobsAreOff() {
        DataSource primary = mock(DataSource.class);
        PolicyCommercialDataSourceConfig config = new PolicyCommercialDataSourceConfig();

        DataSource actual = config.policyDataSource(
            primary,
            false,
            "",
            "",
            "",
            "com.mysql.cj.jdbc.Driver"
        );

        assertThat(actual).isSameAs(primary);
    }

    @Test
    void failsWhenEnabledWithoutCommercialUrl() {
        DataSource primary = mock(DataSource.class);
        PolicyCommercialDataSourceConfig config = new PolicyCommercialDataSourceConfig();

        assertThatThrownBy(() -> config.policyDataSource(
            primary,
            true,
            "",
            "user",
            "secret",
            "com.mysql.cj.jdbc.Driver"
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageNotContaining("secret");
    }
}
