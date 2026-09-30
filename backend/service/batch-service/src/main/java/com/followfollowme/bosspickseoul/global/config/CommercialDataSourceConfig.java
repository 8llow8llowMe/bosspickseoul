package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import com.zaxxer.hikari.HikariDataSource;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PreDestroy;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

/**
 * commercial 스키마용 JdbcTemplate / 트랜잭션 매니저. 정책 수집 전용이던 것을 배치 공용으로 올렸다.
 *
 * <p>빈 이름은 {@code commercial*} 이 정본이고 {@code policy*} 는 별칭이다. 정책 코드가 부르는
 * {@code @Qualifier("policyJdbcTemplate")} / {@code @Transactional("policyTransactionManager")} 는 같은 빈을
 * 가리키므로 정책 동작은 바뀌지 않는다.
 *
 * <p>commercial 용 DataSource 를 빈으로 올리지 않는다. {@code DataSourceAutoConfiguration} 이
 * {@code @ConditionalOnMissingBean(DataSource.class)} 라서, 여기서 DataSource 빈을 하나라도 만들면
 * {@code spring.datasource.*} 로 만들어지던 기본 DataSource 가 사라진다. 그러면 이 설정이 주입받으려던
 * 기본 DataSource 후보가 자기 자신밖에 없어 순환 참조로 기동이 깨진다. 그래서 commercial DataSource 는
 * 빈이 아니라 이 클래스가 들고 있는 객체로 만들고 JdbcTemplate 과 트랜잭션 매니저만 노출한다.
 * 빈이 아니라 Boot 가 풀 메트릭을 붙이지 않으므로 {@link MeterRegistry} 를 여기서 직접 건다.
 *
 * <p>이 두 빈이 무자격 주입의 기본 후보다({@code JdbcTemplateAutoConfiguration},
 * {@code DataSourceTransactionManagerAutoConfiguration} 이 물러난다). 기본 DataSource 쪽(Spring Batch 메타, Quartz,
 * 영역 좌표)은 {@link DistrictDataSourceConfig} 의 {@code district*} 빈을 이름·한정자로만 받는다. 두 번째 풀이 열리지 않은
 * 경우에는 기본 DataSource 를 감싸므로 quarterly CLI(기본 DataSource 가 곧 commercial)의 동작이 그대로다.
 */
@Configuration
@EnableConfigurationProperties(CommercialDataSourceProperties.class)
public class CommercialDataSourceConfig {

    /** 이 중 하나라도 켜지면 commercial 스키마를 따로 연다. */
    public static final List<String> COMMERCIAL_JOB_FLAGS = List.of(
        "batch.policy.enabled",
        "batch.dataset-refresh.enabled",
        "batch.staging-purge.enabled");

    /** 기본 DataSource URL 키. 가드({@code CommercialDataSourceGuardRunner})도 같은 키로 비교한다. */
    public static final String PRIMARY_URL_PROPERTY = "spring.datasource.url";

    private final CommercialDataSourceProperties properties;
    private final Environment environment;
    private final ObjectProvider<MeterRegistry> meterRegistry;
    private HikariDataSource createdCommercialDataSource;

    public CommercialDataSourceConfig(CommercialDataSourceProperties properties, Environment environment,
                                      ObjectProvider<MeterRegistry> meterRegistry) {
        this.properties = properties;
        this.environment = environment;
        this.meterRegistry = meterRegistry;
    }

    /** 켜진 commercial Job 플래그 이름. 두 번째 풀 조건과 기동 가드가 같이 쓴다. */
    public static List<String> enabledCommercialJobFlags(Environment environment) {
        return COMMERCIAL_JOB_FLAGS.stream()
            .filter(flag -> environment.getProperty(flag, Boolean.class, false))
            .toList();
    }

    @Bean(name = {"commercialJdbcTemplate", "policyJdbcTemplate"})
    public JdbcTemplate commercialJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(resolveCommercialDataSource(dataSource));
    }

    @Bean(name = {"commercialTransactionManager", "policyTransactionManager"})
    public DataSourceTransactionManager commercialTransactionManager(
        @Qualifier("commercialJdbcTemplate") JdbcTemplate commercialJdbcTemplate
    ) {
        return new DataSourceTransactionManager(commercialJdbcTemplate.getDataSource());
    }

    /**
     * commercial 을 쓰는 Job 이 모두 꺼져 있거나, URL 이 기본 DataSource 와 같으면 기본 DataSource 를 그대로 쓴다.
     * 한 번 만든 것을 재사용해야 JdbcTemplate 과 트랜잭션 매니저가 같은 커넥션 풀을 본다.
     */
    private DataSource resolveCommercialDataSource(DataSource dataSource) {
        List<String> enabledFlags = enabledCommercialJobFlags(environment);
        if (enabledFlags.isEmpty()) {
            return dataSource;
        }
        if (!properties.hasUrl()) {
            // URL 자체는 싣지 않는다. 켜진 플래그 이름만으로 운영자가 원인을 찾을 수 있다.
            throw new IllegalArgumentException("COMMERCIAL_DB_URL is required when " + String.join(" or ", enabledFlags) + "=true");
        }
        if (properties.url().equals(environment.getProperty(PRIMARY_URL_PROPERTY))) {
            return dataSource;
        }
        if (createdCommercialDataSource == null) {
            createdCommercialDataSource = createPool();
        }
        return createdCommercialDataSource;
    }

    private HikariDataSource createPool() {
        HikariDataSource pool = DataSourceBuilder.create()
            .type(HikariDataSource.class)
            .url(properties.url())
            .username(properties.username())
            .password(properties.password())
            .driverClassName(properties.driverClassName())
            .build();
        pool.setPoolName(properties.poolName());
        pool.setMaximumPoolSize(properties.maximumPoolSize());
        pool.setMinimumIdle(properties.minimumIdle());
        // 풀이 첫 커넥션을 열기 전에만 걸 수 있다. 레지스트리가 없으면(슬라이스 테스트 등) 메트릭 없이 쓴다.
        MeterRegistry registry = meterRegistry.getIfUnique();
        if (registry != null) {
            pool.setMetricRegistry(registry);
        }
        return pool;
    }

    @PreDestroy
    void closeCreatedCommercialDataSource() {
        if (createdCommercialDataSource != null) {
            createdCommercialDataSource.close();
        }
    }
}
