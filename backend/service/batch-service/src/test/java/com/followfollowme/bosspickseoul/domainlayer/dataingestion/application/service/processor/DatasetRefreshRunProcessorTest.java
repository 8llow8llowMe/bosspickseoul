package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshOutcome;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSummary;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshMetricsPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshStatePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** run 1회 조립: 공간 스냅샷, 순서, run 전체 API 예산, 상태 저장, 메트릭. 데이터셋 1종 판단은 모의 객체다. */
class DatasetRefreshRunProcessorTest {

    private static final Instant FIRED = Instant.parse("2026-09-29T20:00:00Z");
    private static final Instant FINISHED = Instant.parse("2026-09-29T20:10:00Z");

    private final DatasetRefreshProcessor datasets = mock(DatasetRefreshProcessor.class);
    private final SpatialReleasePort spatialReleases = mock(SpatialReleasePort.class);
    private final DatasetRefreshStatePort states = mock(DatasetRefreshStatePort.class);
    private final DatasetRefreshMetricsPort metrics = mock(DatasetRefreshMetricsPort.class);
    private final DatasetRefreshProperties properties = new DatasetRefreshProperties(true, null, false, "legacy-20233", "seoul-v1", 100, 1, 0.2, 7);
    private final DatasetRefreshRunProcessor processor = new DatasetRefreshRunProcessor(datasets, spatialReleases, states, metrics, properties,
        Clock.fixed(FINISHED, ZoneOffset.UTC));

    @Test
    void spatialSnapshotNotReadyStopsTheWholeRunBeforeAnyDataset() {
        when(spatialReleases.isReady("legacy-20233")).thenReturn(false);

        DatasetRefreshSummary summary = processor.refreshAll(FIRED);

        assertThat(summary.slots()).hasSize(Dataset.values().length)
            .extracting(DatasetRefreshSlot::result).containsOnly(DatasetRefreshResult.SPATIAL_NOT_READY);
        verify(datasets, never()).refresh(any(), any(), anyInt(), any());
        verify(states, never()).findAll();
        verify(metrics).runFinished(FINISHED);
    }

    @Test
    void datasetsRunInRunOrderAndShareOneApiBudget() {
        when(spatialReleases.isReady("legacy-20233")).thenReturn(true);
        when(states.findAll()).thenReturn(Map.of());
        List<Dataset> order = new ArrayList<>();
        List<Integer> budgets = new ArrayList<>();
        when(datasets.refresh(any(), any(), anyInt(), eq(FIRED))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            order.add(dataset);
            budgets.add(invocation.getArgument(2));
            return new DatasetRefreshOutcome(dataset, List.of(new DatasetRefreshSlot(dataset, null, DatasetRefreshResult.UNCHANGED, "")), 10,
                invocation.getArgument(1));
        });

        DatasetRefreshSummary summary = processor.refreshAll(FIRED);

        assertThat(order).containsExactlyElementsOf(Dataset.inRunOrder());
        assertThat(budgets.subList(0, 3)).containsExactly(100, 90, 80);
        assertThat(summary.apiCalls()).isEqualTo(150);
        assertThat(summary.count(DatasetRefreshResult.UNCHANGED)).isEqualTo(15);
        verify(metrics).apiCalls(150);
        verify(metrics, times(15)).slot(any(), eq(DatasetRefreshResult.UNCHANGED));
        verify(metrics).runFinished(FINISHED);
    }

    @Test
    void storedStatesArePassedInAndOnlyChangedStatesAreSaved() {
        DatasetRefreshState stored = DatasetRefreshState.initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED, 1650);
        DatasetRefreshState probed = DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL).probedWithoutRows(FIRED);
        when(spatialReleases.isReady("legacy-20233")).thenReturn(true);
        when(states.findAll()).thenReturn(Map.of(Dataset.CHANGE_COMMERCIAL, stored));
        when(datasets.refresh(any(), any(), anyInt(), eq(FIRED))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            DatasetRefreshState after = dataset == Dataset.STORE_COMMERCIAL ? probed : invocation.getArgument(1);
            return new DatasetRefreshOutcome(dataset, List.of(), 0, after);
        });

        processor.refreshAll(FIRED);

        verify(datasets).refresh(Dataset.CHANGE_COMMERCIAL, stored, 100, FIRED);
        verify(datasets).refresh(Dataset.STORE_COMMERCIAL, DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL), 100, FIRED);
        verify(states, times(1)).save(any());
        verify(states).save(probed);
    }
}
