package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class PolicyIngestionPropertiesTest {

    @Test
    void defaultsDatasourceWhenOmitted() {
        PolicyIngestionProperties properties = new PolicyIngestionProperties(
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

        assertThat(properties.datasource().hasUrl()).isFalse();
        assertThat(properties.datasource().driverClassName()).isEqualTo("com.mysql.cj.jdbc.Driver");
    }

    @Test
    void failsWhenEnabledWithoutCommercialUrl() {
        assertThatThrownBy(() -> new PolicyIngestionProperties(
            true, "0 0 6 * * ?", "0 30 6 * * ?", 0.5, 30,
            new PolicyIngestionProperties.Bizinfo(
                "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
                "key",
                "소상공인",
                100,
                20,
                30,
                3
            ),
            new PolicyIngestionProperties.Datasource("", "user", "secret", "com.mysql.cj.jdbc.Driver")
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageNotContaining("secret");
    }
}
