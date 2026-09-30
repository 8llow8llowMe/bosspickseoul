package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.BatchTargetGuard;
import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * commercial 스키마에 쓰는 상시 Job(정책 수집·분기 적재 자동 최신화·스테이징 정리)이 하나라도 켜지면 기동 직후 두 번째 풀의 대상을 검사한다.
 * 걸리면 예외로 기동을 멈춘다(fail-closed). 정책 수집의 기동 가드도 이것이다(policyingestion 에는 따로 없다).
 *
 * <ul>
 *   <li>commercial URL 이 기본 DataSource({@code spring.datasource.url} = {@code BATCH_DB_URL}, district)와 같으면 거부한다.
 *       {@link CommercialDataSourceConfig} 가 두 번째 풀을 열지 판단할 때와 같은 키로 비교한다</li>
 *   <li>{@link BatchTargetGuard}: MySQL, {@code BATCH_ALLOWED_SCHEMAS} 에 있는 스키마, 이름에 prod 가 없을 것</li>
 * </ul>
 * 자동 최신화 전용 검사(API 키·버전 형식·상태 테이블)는 {@code DatasetRefreshGuardRunner} 가 이어서 한다. 예외 메시지에 JDBC URL 을 싣지 않는다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CommercialDataSourceGuardRunner implements ApplicationRunner {

    private final CommercialDataSourceProperties commercialDataSource;
    private final Environment environment;

    public CommercialDataSourceGuardRunner(CommercialDataSourceProperties commercialDataSource, Environment environment) {
        this.commercialDataSource = commercialDataSource;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> enabledFlags = CommercialDataSourceConfig.enabledCommercialJobFlags(environment);
        if (enabledFlags.isEmpty()) {
            return;
        }
        String commercialUrl = commercialDataSource.url();
        if (commercialUrl.equals(environment.getProperty(CommercialDataSourceConfig.PRIMARY_URL_PROPERTY))) {
            throw new IllegalArgumentException("Commercial jobs must use COMMERCIAL_DB_URL, not BATCH_DB_URL");
        }
        BatchTargetGuard.verify(commercialUrl, commercialUrl, environment.getProperty("BATCH_ALLOWED_SCHEMAS"));
    }
}
