package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.BatchTargetGuard;
import com.followfollowme.bosspickseoul.global.config.CommercialDataSourceConfig;
import com.followfollowme.bosspickseoul.global.properties.CommercialDataSourceProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * commercial 스키마에 쓰는 상시 Job(정책 수집·분기 적재 자동 최신화·스테이징 정리)이 하나라도 켜지면 기동 직후 대상을 검사한다.
 * 정책 전용이던 {@code PolicySchedulerGuardRunner} 를 일반화했다. 검사에 걸리면 예외로 기동을 멈춘다(fail-closed).
 *
 * <ul>
 *   <li>commercial URL 이 district({@code BATCH_DB_URL})와 같으면 거부한다</li>
 *   <li>{@link BatchTargetGuard}: MySQL, {@code BATCH_ALLOWED_SCHEMAS} 에 있는 스키마, 이름에 prod 가 없을 것</li>
 *   <li>자동 최신화가 켜졌으면 서울 Open API 키와 공간·스키마 버전 형식</li>
 * </ul>
 * 예외 메시지에 JDBC URL 과 API 키를 싣지 않는다.
 */
@Component
@RequiredArgsConstructor
public class CommercialTargetGuardRunner implements ApplicationRunner {

    private static final String IDENTIFIER = "[a-zA-Z0-9_-]{1,64}";

    private final CommercialDataSourceProperties commercialDataSource;
    private final DatasetRefreshProperties refresh;
    private final DatasetSourceProperties datasetSource;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        boolean anyEnabled = CommercialDataSourceConfig.COMMERCIAL_JOB_FLAGS.stream()
            .anyMatch(flag -> environment.getProperty(flag, Boolean.class, false));
        if (!anyEnabled) {
            return;
        }
        String commercialUrl = commercialDataSource.url();
        if (commercialUrl.equals(environment.getProperty("BATCH_DB_URL"))) {
            throw new IllegalArgumentException("Commercial jobs must use COMMERCIAL_DB_URL, not BATCH_DB_URL");
        }
        BatchTargetGuard.verify(commercialUrl, commercialUrl, environment.getProperty("BATCH_ALLOWED_SCHEMAS"));
        if (refresh.enabled()) {
            verifyRefresh();
        }
    }

    private void verifyRefresh() {
        String key = datasetSource.getApiKey();
        if (key == null || !key.matches("[a-zA-Z0-9]+")) {
            throw new IllegalArgumentException("SEOUL_OPEN_DATA_API_KEY is required when batch.dataset-refresh.enabled=true");
        }
        if (!refresh.spatialVersion().matches(IDENTIFIER)) {
            throw new IllegalArgumentException("batch.dataset-refresh.spatial-version must match " + IDENTIFIER);
        }
        if (!"seoul-v1".equals(refresh.schemaVersion())) {
            throw new IllegalArgumentException("batch.dataset-refresh.schema-version must be seoul-v1");
        }
    }
}
