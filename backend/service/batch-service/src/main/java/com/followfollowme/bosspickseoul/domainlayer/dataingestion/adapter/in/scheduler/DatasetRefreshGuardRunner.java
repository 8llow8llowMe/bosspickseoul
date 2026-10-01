package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshStatePort;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 자동 최신화가 켜졌을 때만 기동 직후 검사한다. 걸리면 예외로 기동을 멈춘다(fail-closed).
 * commercial 대상 검사(URL·allowlist·prod 금지)는 {@code global/config/CommercialDataSourceGuardRunner} 가 먼저 한다.
 *
 * <ul>
 *   <li>서울 Open API 키가 있다(값은 싣지 않는다)</li>
 *   <li>공간 버전이 run-id 와 같은 식별자 규칙을 지키고, 스키마 버전이 {@code seoul-v1} 이다</li>
 *   <li>commercial 스키마에 {@code dataset_refresh_state} 가 있고, 어댑터가 쓰는 컬럼이 모두 있다. 없으면 첫 run 이 상태 조회에서 끊기거나
 *       데이터셋마다 "Unknown column" 으로 실패한다. 예전 DDL 로 만든 테이블이면 런북 상단의 ALTER 를 가리킨다</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class DatasetRefreshGuardRunner implements ApplicationRunner {

    private static final String IDENTIFIER = "[a-zA-Z0-9_-]{1,64}";

    private final DatasetRefreshProperties refresh;
    private final DatasetSourceProperties datasetSource;
    private final DatasetRefreshStatePort states;

    public DatasetRefreshGuardRunner(DatasetRefreshProperties refresh, DatasetSourceProperties datasetSource, DatasetRefreshStatePort states) {
        this.refresh = refresh;
        this.datasetSource = datasetSource;
        this.states = states;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!refresh.enabled()) {
            return;
        }
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
        if (!states.tableExists()) {
            throw new IllegalStateException("dataset_refresh_state is missing in the commercial schema; apply dataset-refresh-state-schema.sql");
        }
        List<String> missing = states.missingColumns();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("dataset_refresh_state is missing columns " + missing
                + "; apply the ALTER TABLE in the header of dataset-refresh-state-schema.sql");
        }
    }
}
