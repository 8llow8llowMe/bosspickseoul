package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class CommercialTargetGuardRunnerTest {

    private static final String COMMERCIAL =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev?serverTimezone=Asia/Seoul";
    private static final String DISTRICT =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev?serverTimezone=Asia/Seoul";
    private static final String PROD =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_prod?serverTimezone=Asia/Seoul";

    @Test
    void doesNothingWhenNoCommercialJobIsEnabled() {
        CommercialTargetGuardRunner runner = runner("", refresh(false, "legacy-20233"), "", new MockEnvironment());

        assertThatCode(() -> runner.run(null)).doesNotThrowAnyException();
    }

    @Test
    void acceptsDistinctAllowlistedCommercialUrlForPolicy() {
        MockEnvironment environment = environment("batch.policy.enabled").withProperty("BATCH_DB_URL", DISTRICT);

        assertThatCode(() -> runner(COMMERCIAL, refresh(false, "legacy-20233"), "", environment).run(null)).doesNotThrowAnyException();
    }

    @Test
    void rejectsWhenCommercialUrlEqualsBatchUrl() {
        MockEnvironment environment = environment("batch.policy.enabled").withProperty("BATCH_DB_URL", COMMERCIAL);

        assertThatThrownBy(() -> runner(COMMERCIAL, refresh(false, "legacy-20233"), "", environment).run(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageNotContaining(COMMERCIAL);
    }

    @Test
    void rejectsProductionSchemaForEveryCommercialJob() {
        for (String flag : new String[] {"batch.policy.enabled", "batch.dataset-refresh.enabled", "batch.staging-purge.enabled"}) {
            MockEnvironment environment = environment(flag).withProperty("BATCH_DB_URL", DISTRICT)
                .withProperty("BATCH_ALLOWED_SCHEMAS", "bosspickseoul_commercial_prod");

            assertThatThrownBy(() -> runner(PROD, refresh(true, "legacy-20233"), "key123", environment).run(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining(PROD);
        }
    }

    @Test
    void refreshRequiresTheSeoulApiKey() {
        MockEnvironment environment = environment("batch.dataset-refresh.enabled").withProperty("BATCH_DB_URL", DISTRICT);

        assertThatThrownBy(() -> runner(COMMERCIAL, refresh(true, "legacy-20233"), "", environment).run(null))
            .hasMessageContaining("SEOUL_OPEN_DATA_API_KEY");
        assertThatCode(() -> runner(COMMERCIAL, refresh(true, "legacy-20233"), "key123", environment).run(null)).doesNotThrowAnyException();
    }

    @Test
    void refreshRejectsAMalformedSpatialVersion() {
        MockEnvironment environment = environment("batch.dataset-refresh.enabled").withProperty("BATCH_DB_URL", DISTRICT);

        assertThatThrownBy(() -> runner(COMMERCIAL, refresh(true, "legacy 2023;"), "key123", environment).run(null))
            .hasMessageContaining("spatial-version");
    }

    private static MockEnvironment environment(String flag) {
        return new MockEnvironment().withProperty(flag, "true").withProperty("BATCH_ALLOWED_SCHEMAS", "bosspickseoul_commercial_dev");
    }

    private static DatasetRefreshProperties refresh(boolean enabled, String spatialVersion) {
        return new DatasetRefreshProperties(enabled, null, false, spatialVersion, "seoul-v1", 600, 1, 0.2, 7);
    }

    private static CommercialTargetGuardRunner runner(String url, DatasetRefreshProperties refresh, String apiKey, MockEnvironment environment) {
        DatasetSourceProperties source = new DatasetSourceProperties();
        source.setApiKey(apiKey);
        return new CommercialTargetGuardRunner(new CommercialDataSourceProperties(url, "user", "secret", null), refresh, source, environment);
    }
}
