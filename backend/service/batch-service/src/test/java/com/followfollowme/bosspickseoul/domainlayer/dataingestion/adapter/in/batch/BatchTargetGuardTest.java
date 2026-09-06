package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class BatchTargetGuardTest {

    private static final String DEV_URL =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev?serverTimezone=Asia/Seoul";

    @Test
    void acceptsOnlyAnExplicitlyMatchedAllowlistedDevelopmentSchema() {
        assertThatCode(() -> BatchTargetGuard.verify(
            DEV_URL,
            DEV_URL,
            "bosspickseoul_district_dev, bosspickseoul_commercial_dev"
        )).doesNotThrowAnyException();
    }

    @Test
    void rejectsMissingMismatchedAndUnlistedTargets() {
        assertRejected(null, DEV_URL, "bosspickseoul_commercial_dev");
        assertRejected(DEV_URL, DEV_URL + "&rewriteBatchedStatements=true", "bosspickseoul_commercial_dev");
        assertRejected(DEV_URL, DEV_URL, "bosspickseoul_district_dev");
    }

    @Test
    void rejectsProductionCredentialsAndNonMysqlTargetsWithoutLeakingTheUrl() {
        String production = "jdbc:mysql://prod-db.internal:3306/bosspickseoul_commercial_prod";
        assertRejected(production, production, "bosspickseoul_commercial_prod");

        String credentials = "jdbc:mysql://user:password@dev-db.internal:3306/bosspickseoul_commercial_dev";
        assertThatThrownBy(() -> BatchTargetGuard.verify(credentials, credentials, "bosspickseoul_commercial_dev"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageNotContaining("user")
            .hasMessageNotContaining("password")
            .hasMessageNotContaining(credentials);

        String postgres = "jdbc:postgresql://dev-db.internal:5432/bosspickseoul_commercial_dev";
        assertRejected(postgres, postgres, "bosspickseoul_commercial_dev");
    }

    private void assertRejected(String explicitUrl, String configuredUrl, String allowlist) {
        assertThatThrownBy(() -> BatchTargetGuard.verify(explicitUrl, configuredUrl, allowlist))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
