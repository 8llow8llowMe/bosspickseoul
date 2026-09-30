package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshOutcome;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSummary;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshMetricsPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DatasetRefreshFacadeTest {

    private static final Instant FIRED = Instant.parse("2026-09-29T20:00:00Z");

    private final DatasetRefreshProcessor processor = mock(DatasetRefreshProcessor.class);
    private final DatasetRefreshMetricsPort metrics = mock(DatasetRefreshMetricsPort.class);
    private final DatasetRefreshProperties properties = new DatasetRefreshProperties(true, null, false, "legacy-20233", "seoul-v1", 100, 1, 0.2, 7);
    private final DatasetRefreshFacade facade = new DatasetRefreshFacade(processor, metrics, properties,
        Clock.fixed(Instant.parse("2026-09-29T20:10:00Z"), ZoneOffset.UTC));

    @Test
    void spatialSnapshotNotReadyStopsTheWholeRunBeforeAnyDataset() {
        when(processor.spatialReady()).thenReturn(false);

        DatasetRefreshSummary summary = facade.refresh(FIRED);

        assertThat(summary.slots()).hasSize(Dataset.values().length)
            .extracting(DatasetRefreshSlot::result).containsOnly(DatasetRefreshResult.SPATIAL_NOT_READY);
        verify(processor, never()).refresh(any(), any(), anyInt(), any());
        verify(processor, never()).loadStates();
    }

    @Test
    void datasetsRunInRunOrderAndShareOneApiBudget() {
        when(processor.spatialReady()).thenReturn(true);
        when(processor.loadStates()).thenReturn(Map.of());
        List<Dataset> order = new ArrayList<>();
        List<Integer> budgets = new ArrayList<>();
        when(processor.refresh(any(), any(), anyInt(), eq(FIRED))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            order.add(dataset);
            budgets.add(invocation.getArgument(2));
            return new DatasetRefreshOutcome(dataset, List.of(new DatasetRefreshSlot(dataset, null, DatasetRefreshResult.UNCHANGED, "")), 10,
                invocation.getArgument(1));
        });

        DatasetRefreshSummary summary = facade.refresh(FIRED);

        assertThat(order).containsExactlyElementsOf(Dataset.inRunOrder());
        assertThat(budgets.subList(0, 3)).containsExactly(100, 90, 80);
        assertThat(summary.apiCalls()).isEqualTo(150);
        assertThat(summary.count(DatasetRefreshResult.UNCHANGED)).isEqualTo(15);
        verify(metrics).apiCalls(150);
        verify(metrics).runFinished(Instant.parse("2026-09-29T20:10:00Z"));
    }

    @Test
    void storedStatesArePassedInAndEveryOutcomeStateIsOfferedForSaving() {
        DatasetRefreshState stored = DatasetRefreshState.initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED, 1650);
        when(processor.spatialReady()).thenReturn(true);
        when(processor.loadStates()).thenReturn(Map.of(Dataset.CHANGE_COMMERCIAL, stored));
        when(processor.refresh(any(), any(), anyInt(), eq(FIRED))).thenAnswer(invocation ->
            new DatasetRefreshOutcome(invocation.getArgument(0), List.of(), 0, invocation.getArgument(1)));

        facade.refresh(FIRED);

        verify(processor).refresh(Dataset.CHANGE_COMMERCIAL, stored, 100, FIRED);
        verify(processor).saveIfChanged(stored, stored);
        verify(processor).saveIfChanged(DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL), DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL));
    }
}
