package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import jakarta.annotation.PreDestroy;
import java.io.Closeable;
import java.util.List;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
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
 *
 * <p>이 두 빈이 컨텍스트의 유일한 JdbcTemplate / 트랜잭션 매니저다({@code JdbcTemplateAutoConfiguration},
 * {@code DataSourceTransactionManagerAutoConfiguration} 이 물러난다). 두 번째 풀이 열리지 않은 경우에는 기본
 * DataSource 를 감싸므로 quarterly CLI(기본 DataSource 가 곧 commercial)의 동작이 그대로다.
 */
@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(CommercialDataSourceProperties.class)
public class CommercialDataSourceConfig {

    /** 이 중 하나라도 켜지면 commercial 스키마를 따로 연다. */
    static final List<String> COMMERCIAL_JOB_FLAGS = List.of(
        "batch.policy.enabled",
        "batch.dataset-refresh.enabled",
        "batch.staging-purge.enabled");

    private final CommercialDataSourceProperties properties;
    private final Environment environment;
    private DataSource createdCommercialDataSource;

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
        List<String> enabledFlags = COMMERCIAL_JOB_FLAGS.stream()
            .filter(flag -> environment.getProperty(flag, Boolean.class, false))
            .toList();
        if (enabledFlags.isEmpty()) {
            return dataSource;
        }
        if (!properties.hasUrl()) {
            // URL 자체는 싣지 않는다. 켜진 플래그 이름만으로 운영자가 원인을 찾을 수 있다.
            throw new IllegalArgumentException("COMMERCIAL_DB_URL is required when " + String.join(" or ", enabledFlags) + "=true");
        }
        if (properties.url().equals(environment.getProperty("spring.datasource.url"))) {
            return dataSource;
        }
        if (createdCommercialDataSource == null) {
            createdCommercialDataSource = DataSourceBuilder.create()
                .url(properties.url())
                .username(properties.username())
                .password(properties.password())
                .driverClassName(properties.driverClassName())
                .build();
        }
        return createdCommercialDataSource;
    }

    @PreDestroy
    void closeCreatedCommercialDataSource() throws Exception {
        if (createdCommercialDataSource instanceof Closeable closeable) {
            closeable.close();
        }
    }
}
