package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * 접속 정보는 {@link CommercialDataSourceProperties} 로 옮겼다. "켜져 있으면 URL 필수" 검증은
 * {@code CommercialDataSourceConfigTest} 가 고정한다.
 */
class PolicyIngestionPropertiesTest {

    @Test
    void defaultsBlankCronAndBizinfo() {
        PolicyIngestionProperties properties = new PolicyIngestionProperties(false, " ", null, 0.5, 30, null);

        assertThat(properties.collectCron()).isEqualTo("0 0 6 * * ?");
        assertThat(properties.purgeCron()).isEqualTo("0 30 6 * * ?");
        assertThat(properties.bizinfo()).isNotNull();
    }

    @Test
    void enablingPolicyNoLongerRequiresItsOwnDatasource() {
        PolicyIngestionProperties properties = new PolicyIngestionProperties(true, null, null, 0.5, 30, null);

        assertThat(properties.enabled()).isTrue();
    }
}
