package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

@ExtendWith(MockitoExtension.class)
class PolicySchedulerGuardRunnerTest {

    private static final String COMMERCIAL =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev?serverTimezone=Asia/Seoul";
    private static final String DISTRICT =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev?serverTimezone=Asia/Seoul";

    @Mock
    private Environment environment;

    @Test
    void acceptsDistinctAllowlistedCommercialUrl() {
        when(environment.getProperty("BATCH_DB_URL")).thenReturn(DISTRICT);
        when(environment.getProperty("BATCH_ALLOWED_SCHEMAS")).thenReturn("bosspickseoul_commercial_dev");

        PolicySchedulerGuardRunner runner = new PolicySchedulerGuardRunner(enabledProperties(COMMERCIAL), environment);

        assertThatCode(() -> runner.run(null)).doesNotThrowAnyException();
    }

    @Test
    void rejectsWhenCommercialUrlEqualsBatchUrl() {
        when(environment.getProperty("BATCH_DB_URL")).thenReturn(COMMERCIAL);

        PolicySchedulerGuardRunner runner = new PolicySchedulerGuardRunner(enabledProperties(COMMERCIAL), environment);

        assertThatThrownBy(() -> runner.run(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageNotContaining(COMMERCIAL);
    }

    private static PolicyIngestionProperties enabledProperties(String url) {
        return new PolicyIngestionProperties(
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
            new PolicyIngestionProperties.Datasource(url, "user", "secret", "com.mysql.cj.jdbc.Driver")
        );
    }
}
