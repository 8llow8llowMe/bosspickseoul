package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshStatePort;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 자동 최신화 전용 기동 가드. commercial 대상 검사는 CommercialDataSourceGuardRunner 가 먼저 한다. */
class DatasetRefreshGuardRunnerTest {

    private final DatasetRefreshStatePort states = mock(DatasetRefreshStatePort.class);

    @Test
    void doesNothingWhenRefreshIsDisabled() {
        assertThatCode(() -> runner(refresh(false, "legacy-20233"), "").run(null)).doesNotThrowAnyException();
        verifyNoInteractions(states);
    }

    @Test
    void requiresTheSeoulApiKeyWithoutEchoingIt() {
        when(states.tableExists()).thenReturn(true);

        assertThatThrownBy(() -> runner(refresh(true, "legacy-20233"), "").run(null))
            .hasMessageContaining("SEOUL_OPEN_DATA_API_KEY");
        assertThatThrownBy(() -> runner(refresh(true, "legacy-20233"), "bad key!").run(null))
            .hasMessageNotContaining("bad key!");
        assertThatCode(() -> runner(refresh(true, "legacy-20233"), "key123").run(null)).doesNotThrowAnyException();
    }

    @Test
    void rejectsAMalformedSpatialVersion() {
        assertThatThrownBy(() -> runner(refresh(true, "legacy 2023;"), "key123").run(null))
            .hasMessageContaining("spatial-version");
    }

    @Test
    void refusesToStartWithoutTheStateTable() {
        when(states.tableExists()).thenReturn(false);

        assertThatThrownBy(() -> runner(refresh(true, "legacy-20233"), "key123").run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("dataset_refresh_state")
            .hasMessageContaining("dataset-refresh-state-schema.sql");
    }

    /** 예전 DDL 로 만든 테이블에는 새 컬럼이 없다. 첫 run 이 데이터셋마다 "Unknown column" 으로 실패하기 전에 기동을 멈춘다. */
    @Test
    void refusesToStartWhenTheStateTableLacksColumns() {
        when(states.tableExists()).thenReturn(true);
        when(states.missingColumns()).thenReturn(List.of("last_reproject_dry_run_period"));

        assertThatThrownBy(() -> runner(refresh(true, "legacy-20233"), "key123").run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("last_reproject_dry_run_period")
            .hasMessageContaining("ALTER TABLE");
    }

    private static DatasetRefreshProperties refresh(boolean enabled, String spatialVersion) {
        return new DatasetRefreshProperties(enabled, null, false, spatialVersion, "seoul-v1", 600, 1, 0.2, 7, null);
    }

    private DatasetRefreshGuardRunner runner(DatasetRefreshProperties refresh, String apiKey) {
        DatasetSourceProperties source = new DatasetSourceProperties();
        source.setApiKey(apiKey);
        return new DatasetRefreshGuardRunner(refresh, source, states);
    }
}
