package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshStatePort;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
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

    private static DatasetRefreshProperties refresh(boolean enabled, String spatialVersion) {
        return new DatasetRefreshProperties(enabled, null, false, spatialVersion, "seoul-v1", 600, 1, 0.2, 7);
    }

    private DatasetRefreshGuardRunner runner(DatasetRefreshProperties refresh, String apiKey) {
        DatasetSourceProperties source = new DatasetSourceProperties();
        source.setApiKey(apiKey);
        return new DatasetRefreshGuardRunner(refresh, source, states);
    }
}
