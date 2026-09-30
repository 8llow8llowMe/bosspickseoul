package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

/** 정책 수집·자동 최신화·스테이징 정리가 공유하는 commercial 대상 가드. 정책 수집의 기동 가드도 이것이다. */
class CommercialDataSourceGuardRunnerTest {

    private static final String COMMERCIAL =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev?serverTimezone=Asia/Seoul";
    private static final String DISTRICT =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev?serverTimezone=Asia/Seoul";
    private static final String PROD =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_prod?serverTimezone=Asia/Seoul";

    @Test
    void doesNothingWhenNoCommercialJobIsEnabled() {
        assertThatCode(() -> runner("", new MockEnvironment()).run(null)).doesNotThrowAnyException();
    }

    @Test
    void acceptsDistinctAllowlistedCommercialUrlForEveryCommercialJob() {
        for (String flag : CommercialDataSourceConfig.COMMERCIAL_JOB_FLAGS) {
            MockEnvironment environment = environment(flag).withProperty("spring.datasource.url", DISTRICT);

            assertThatCode(() -> runner(COMMERCIAL, environment).run(null)).as(flag).doesNotThrowAnyException();
        }
    }

    /** 두 번째 풀을 열지 정하는 CommercialDataSourceConfig 와 같은 키(spring.datasource.url)로 비교한다. */
    @Test
    void rejectsWhenCommercialUrlEqualsThePrimaryDataSourceUrl() {
        MockEnvironment environment = environment("batch.policy.enabled").withProperty("spring.datasource.url", COMMERCIAL);

        assertThatThrownBy(() -> runner(COMMERCIAL, environment).run(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageNotContaining(COMMERCIAL);
    }

    @Test
    void rejectsProductionSchemaForEveryCommercialJob() {
        for (String flag : CommercialDataSourceConfig.COMMERCIAL_JOB_FLAGS) {
            MockEnvironment environment = environment(flag).withProperty("spring.datasource.url", DISTRICT)
                .withProperty("BATCH_ALLOWED_SCHEMAS", "bosspickseoul_commercial_prod");

            assertThatThrownBy(() -> runner(PROD, environment).run(null))
                .as(flag)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining(PROD);
        }
    }

    private static MockEnvironment environment(String flag) {
        return new MockEnvironment().withProperty(flag, "true").withProperty("BATCH_ALLOWED_SCHEMAS", "bosspickseoul_commercial_dev");
    }

    private static CommercialDataSourceGuardRunner runner(String url, MockEnvironment environment) {
        return new CommercialDataSourceGuardRunner(CommercialDataSourceProperties.of(url, "user", "secret", null), environment);
    }
}
