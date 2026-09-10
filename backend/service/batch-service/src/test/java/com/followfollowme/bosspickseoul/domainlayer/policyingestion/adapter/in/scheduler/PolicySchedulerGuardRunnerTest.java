package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
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

    private PolicySchedulerGuardRunner runner;

    @BeforeEach
    void setUp() {
        runner = new PolicySchedulerGuardRunner(environment);
    }

    @Test
    void acceptsDistinctAllowlistedCommercialUrl() {
        when(environment.getProperty("COMMERCIAL_DB_URL")).thenReturn(COMMERCIAL);
        when(environment.getProperty("BATCH_DB_URL")).thenReturn(DISTRICT);
        when(environment.getProperty("batch.policy-datasource.url")).thenReturn(COMMERCIAL);
        when(environment.getProperty("BATCH_ALLOWED_SCHEMAS")).thenReturn("bosspickseoul_commercial_dev");

        assertThatCode(() -> runner.run(null)).doesNotThrowAnyException();
    }

    @Test
    void rejectsWhenCommercialUrlEqualsBatchUrl() {
        when(environment.getProperty("COMMERCIAL_DB_URL")).thenReturn(COMMERCIAL);
        when(environment.getProperty("BATCH_DB_URL")).thenReturn(COMMERCIAL);

        assertThatThrownBy(() -> runner.run(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageNotContaining(COMMERCIAL);
    }
}
