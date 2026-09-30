package com.followfollowme.bosspickseoul.global.config;

import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.batch.BatchTransactionManager;
import org.springframework.boot.autoconfigure.quartz.QuartzTransactionManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

/**
 * 기본 DataSource({@code spring.datasource.*} = {@code BATCH_DB_URL}) 용 트랜잭션 매니저 / JdbcTemplate.
 * 상시 컨테이너에서는 district 이고, quarterly CLI 에서는 기본 DataSource 가 commercial 이라 이 빈도 commercial 을 감싼다.
 *
 * <p>왜 필요한가: {@link CommercialDataSourceConfig} 가 JdbcTemplate / 트랜잭션 매니저를 만들면 Boot 자동 구성이 물러나
 * 컨텍스트에 commercial 것만 남는다. 그러면 Boot 가 JobRepository 와 Quartz 에 commercial 트랜잭션 매니저를 준다
 * (DataSource 는 district). {@code BATCH_*} 쓰기가 트랜잭션 없이 문장마다 커밋되고, SERIALIZABLE 이 엉뚱한 커넥션에 걸리고,
 * Quartz 의 {@code QRTZ_LOCKS ... FOR UPDATE} 가 바로 풀린다. 한정자 없는 JdbcTemplate 주입(영역 좌표)도 commercial 로 간다.
 *
 * <p>두 빈 모두 {@code defaultCandidate = false} 라 무자격 주입의 기본 후보는 계속 commercial 빈이다. 기본 DataSource 에 쓰는
 * 코드는 {@code @Qualifier("districtJdbcTemplate")} / {@code @Transactional("districtTransactionManager")} 로 이름을 적고,
 * Spring Batch 와 Quartz 는 {@link BatchTransactionManager} / {@link QuartzTransactionManager} 한정자로 이 매니저를 받는다.
 * 두 번째 풀이 열리지 않을 때(플래그 off·CLI)는 commercial 빈과 같은 DataSource 를 감싼다. 같은 DataSource 의 트랜잭션 매니저는
 * 서로의 트랜잭션에 참여하므로 동작이 예전과 같다.
 */
@Configuration
public class DistrictDataSourceConfig {

    @Bean(defaultCandidate = false)
    @BatchTransactionManager
    @QuartzTransactionManager
    public DataSourceTransactionManager districtTransactionManager(DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }

    @Bean(defaultCandidate = false)
    public JdbcTemplate districtJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
