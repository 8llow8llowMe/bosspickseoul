package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.mock.env.MockEnvironment;

class CommercialDataSourceConfigTest {

    private static final String COMMERCIAL = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev";
    private static final String DISTRICT = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev";

    @Test
    @DisplayName("commercial 을 쓰는 Job 이 모두 꺼져 있으면 기본 DataSource 를 그대로 쓴다")
    void reusesPrimaryDataSourceWhenCommercialJobsAreOff() throws Exception {
        DataSource primary = mock(DataSource.class);
        CommercialDataSourceConfig config = new CommercialDataSourceConfig(properties(COMMERCIAL), new MockEnvironment());

        assertThat(config.commercialJdbcTemplate(primary).getDataSource()).isSameAs(primary);
        config.closeCreatedCommercialDataSource();
    }

    @Test
    @DisplayName("트랜잭션 매니저가 JdbcTemplate 과 같은 DataSource 를 본다")
    void transactionManagerSharesTheJdbcTemplateDataSource() {
        DataSource primary = mock(DataSource.class);
        CommercialDataSourceConfig config = new CommercialDataSourceConfig(properties(""), new MockEnvironment());

        JdbcTemplate jdbcTemplate = config.commercialJdbcTemplate(primary);

        assertThat(config.commercialTransactionManager(jdbcTemplate).getDataSource()).isSameAs(primary);
    }

    @Test
    @DisplayName("정책·자동 최신화·스테이징 정리 중 하나라도 켜지면 두 번째 풀을 연다")
    void opensSecondPoolForEachCommercialJobFlag() throws Exception {
        for (String flag : CommercialDataSourceConfig.COMMERCIAL_JOB_FLAGS) {
            DataSource primary = mock(DataSource.class);
            MockEnvironment environment = new MockEnvironment()
                .withProperty(flag, "true")
                .withProperty("spring.datasource.url", DISTRICT);
            CommercialDataSourceConfig config = new CommercialDataSourceConfig(properties(COMMERCIAL), environment);

            JdbcTemplate first = config.commercialJdbcTemplate(primary);
            JdbcTemplate second = config.commercialJdbcTemplate(primary);

            assertThat(first.getDataSource()).as(flag).isNotSameAs(primary);
            assertThat(second.getDataSource()).as("풀은 한 번만 만든다").isSameAs(first.getDataSource());
            config.closeCreatedCommercialDataSource();
        }
    }

    @Test
    @DisplayName("URL 이 기본 DataSource 와 같으면 풀을 하나 더 열지 않는다")
    void reusesPrimaryWhenUrlMatchesDefaultDatasource() {
        DataSource primary = mock(DataSource.class);
        MockEnvironment environment = new MockEnvironment()
            .withProperty("batch.dataset-refresh.enabled", "true")
            .withProperty("spring.datasource.url", COMMERCIAL);
        CommercialDataSourceConfig config = new CommercialDataSourceConfig(properties(COMMERCIAL), environment);

        assertThat(config.commercialJdbcTemplate(primary).getDataSource()).isSameAs(primary);
    }

    @Test
    @DisplayName("켜졌는데 COMMERCIAL_DB_URL 이 없으면 기동을 거부하고 비밀값을 싣지 않는다")
    void failsWhenEnabledWithoutCommercialUrl() {
        MockEnvironment environment = new MockEnvironment().withProperty("batch.policy.enabled", "true");
        CommercialDataSourceConfig config = new CommercialDataSourceConfig(properties(""), environment);

        assertThatThrownBy(() -> config.commercialJdbcTemplate(mock(DataSource.class)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("COMMERCIAL_DB_URL")
            .hasMessageContaining("batch.policy.enabled")
            .hasMessageNotContaining("secret");
    }

    @Test
    @DisplayName("정책 코드가 부르는 policy* 이름이 commercial* 과 같은 빈을 가리킨다")
    void policyBeanNamesAreAliasesOfCommercialBeans() {
        new ApplicationContextRunner()
            .withBean(DataSource.class, () -> mock(DataSource.class))
            .withUserConfiguration(CommercialDataSourceConfig.class)
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(context.getBean("policyJdbcTemplate")).isSameAs(context.getBean("commercialJdbcTemplate"));
                assertThat(context.getBean("policyTransactionManager"))
                    .isSameAs(context.getBean("commercialTransactionManager"))
                    .isInstanceOf(DataSourceTransactionManager.class);
            });
    }

    private static CommercialDataSourceProperties properties(String url) {
        return new CommercialDataSourceProperties(url, "user", "secret", "com.mysql.cj.jdbc.Driver");
    }
}
