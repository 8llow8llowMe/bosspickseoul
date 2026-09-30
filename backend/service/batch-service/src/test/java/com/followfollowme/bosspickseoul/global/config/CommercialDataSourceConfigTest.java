package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import com.zaxxer.hikari.HikariDataSource;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.mock.env.MockEnvironment;

class CommercialDataSourceConfigTest {

    private static final String COMMERCIAL = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev";
    private static final String DISTRICT = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev";

    @Test
    @DisplayName("commercial 을 쓰는 Job 이 모두 꺼져 있으면 기본 DataSource 를 그대로 쓴다")
    void reusesPrimaryDataSourceWhenCommercialJobsAreOff() {
        DataSource primary = mock(DataSource.class);
        CommercialDataSourceConfig config = config(properties(COMMERCIAL), new MockEnvironment());

        assertThat(config.commercialJdbcTemplate(primary).getDataSource()).isSameAs(primary);
        config.closeCreatedCommercialDataSource();
    }

    @Test
    @DisplayName("트랜잭션 매니저가 JdbcTemplate 과 같은 DataSource 를 본다")
    void transactionManagerSharesTheJdbcTemplateDataSource() {
        DataSource primary = mock(DataSource.class);
        CommercialDataSourceConfig config = config(properties(""), new MockEnvironment());

        JdbcTemplate jdbcTemplate = config.commercialJdbcTemplate(primary);

        assertThat(config.commercialTransactionManager(jdbcTemplate).getDataSource()).isSameAs(primary);
    }

    @Test
    @DisplayName("정책·자동 최신화·스테이징 정리 중 하나라도 켜지면 두 번째 풀을 연다")
    void opensSecondPoolForEachCommercialJobFlag() {
        for (String flag : CommercialDataSourceConfig.COMMERCIAL_JOB_FLAGS) {
            DataSource primary = mock(DataSource.class);
            CommercialDataSourceConfig config = config(properties(COMMERCIAL), enabled(flag));

            JdbcTemplate first = config.commercialJdbcTemplate(primary);
            JdbcTemplate second = config.commercialJdbcTemplate(primary);

            assertThat(first.getDataSource()).as(flag).isNotSameAs(primary);
            assertThat(second.getDataSource()).as("풀은 한 번만 만든다").isSameAs(first.getDataSource());
            config.closeCreatedCommercialDataSource();
        }
    }

    @Test
    @DisplayName("두 번째 풀은 설정한 크기·이름으로 열고, 레지스트리가 있으면 Hikari 메트릭을 건다")
    void secondPoolUsesTheConfiguredSizeNameAndMetrics() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        StaticListableBeanFactory beans = new StaticListableBeanFactory();
        beans.addBean("meterRegistry", registry);
        CommercialDataSourceProperties pool = new CommercialDataSourceProperties(COMMERCIAL, "user", "secret", null, 3, 0, "batch-commercial-test");
        CommercialDataSourceConfig config = new CommercialDataSourceConfig(pool, enabled("batch.dataset-refresh.enabled"),
            beans.getBeanProvider(MeterRegistry.class));

        HikariDataSource created = (HikariDataSource) config.commercialJdbcTemplate(mock(DataSource.class)).getDataSource();

        assertThat(created.getPoolName()).isEqualTo("batch-commercial-test");
        assertThat(created.getMaximumPoolSize()).isEqualTo(3);
        assertThat(created.getMinimumIdle()).isZero();
        assertThat(created.getMetricRegistry()).isSameAs(registry);
        config.closeCreatedCommercialDataSource();
    }

    @Test
    @DisplayName("풀 설정이 비어 있으면 4 / 1 / batch-commercial 이고, 범위를 넘으면 기동을 거부한다")
    void poolSettingsDefaultAndAreBounded() {
        CommercialDataSourceProperties defaults = CommercialDataSourceProperties.of(COMMERCIAL, "user", "secret", null);

        assertThat(defaults.maximumPoolSize()).isEqualTo(4);
        assertThat(defaults.minimumIdle()).isEqualTo(1);
        assertThat(defaults.poolName()).isEqualTo("batch-commercial");
        assertThatThrownBy(() -> new CommercialDataSourceProperties(COMMERCIAL, "u", "p", null, 21, 1, null))
            .hasMessageContaining("maximum-pool-size");
        assertThatThrownBy(() -> new CommercialDataSourceProperties(COMMERCIAL, "u", "p", null, 2, 3, null))
            .hasMessageContaining("minimum-idle");
    }

    @Test
    @DisplayName("application.yml 의 풀 설정(4 / 1 / batch-commercial)이 상시 프로파일에서 그대로 바인딩된다")
    void applicationYamlBindsThePoolSettings() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles("dev");
        ConfigDataEnvironmentPostProcessor.applyTo(environment);

        CommercialDataSourceProperties bound = Binder.get(environment)
            .bind("batch.commercial.datasource", CommercialDataSourceProperties.class).get();

        assertThat(bound.maximumPoolSize()).isEqualTo(4);
        assertThat(bound.minimumIdle()).isEqualTo(1);
        assertThat(bound.poolName()).isEqualTo("batch-commercial");
    }

    @Test
    @DisplayName("URL 이 기본 DataSource 와 같으면 풀을 하나 더 열지 않는다")
    void reusesPrimaryWhenUrlMatchesDefaultDatasource() {
        DataSource primary = mock(DataSource.class);
        MockEnvironment environment = new MockEnvironment()
            .withProperty("batch.dataset-refresh.enabled", "true")
            .withProperty("spring.datasource.url", COMMERCIAL);
        CommercialDataSourceConfig config = config(properties(COMMERCIAL), environment);

        assertThat(config.commercialJdbcTemplate(primary).getDataSource()).isSameAs(primary);
    }

    @Test
    @DisplayName("켜졌는데 COMMERCIAL_DB_URL 이 없으면 기동을 거부하고 비밀값을 싣지 않는다")
    void failsWhenEnabledWithoutCommercialUrl() {
        MockEnvironment environment = new MockEnvironment().withProperty("batch.policy.enabled", "true");
        CommercialDataSourceConfig config = config(properties(""), environment);

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

    private static MockEnvironment enabled(String flag) {
        return new MockEnvironment().withProperty(flag, "true").withProperty("spring.datasource.url", DISTRICT);
    }

    private static CommercialDataSourceConfig config(CommercialDataSourceProperties properties, MockEnvironment environment) {
        return new CommercialDataSourceConfig(properties, environment, noRegistry());
    }

    private static ObjectProvider<MeterRegistry> noRegistry() {
        return new StaticListableBeanFactory().getBeanProvider(MeterRegistry.class);
    }

    private static CommercialDataSourceProperties properties(String url) {
        return CommercialDataSourceProperties.of(url, "user", "secret", "com.mysql.cj.jdbc.Driver");
    }
}
