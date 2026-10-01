package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ApiCallBudget;
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
    private final DatasetRefreshProperties properties =
        new DatasetRefreshProperties(true, null, false, "legacy-20233", "seoul-v1", 100, 1, 0.2, 7, null);
    private final DatasetRefreshRunProcessor processor = new DatasetRefreshRunProcessor(datasets, spatialReleases, states, metrics, properties,
        Clock.fixed(FINISHED, ZoneOffset.UTC));

    /** 데이터셋마다 {@code calls} 만큼 예산을 쓰고 UNCHANGED 를 낸다. */
    private void everyDatasetSpends(int calls, List<Dataset> order, List<Integer> remaining) {
        when(datasets.refresh(any(), any(), any(ApiCallBudget.class), eq(FIRED))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            ApiCallBudget budget = invocation.getArgument(2);
            order.add(dataset);
            remaining.add(budget.remaining());
            for (int call = 0; call < calls; call++) {
                budget.spend();
            }
            return new DatasetRefreshOutcome(dataset, List.of(new DatasetRefreshSlot(dataset, null, DatasetRefreshResult.UNCHANGED, "")), calls,
                invocation.getArgument(1));
        });
    }

    @Test
    void spatialSnapshotNotReadyStopsTheWholeRunBeforeAnyDataset() {
        when(spatialReleases.isReady("legacy-20233")).thenReturn(false);

        DatasetRefreshSummary summary = processor.refreshAll(FIRED);

        assertThat(summary.slots()).hasSize(Dataset.values().length)
            .extracting(DatasetRefreshSlot::result).containsOnly(DatasetRefreshResult.SPATIAL_NOT_READY);
        verify(datasets, never()).refresh(any(), any(), any(), any());
        verify(states, never()).findAll();
        verify(metrics).runFinished(FINISHED);
    }

    @Test
    void datasetsRunInRunOrderAndShareOneApiBudget() {
        when(spatialReleases.isReady("legacy-20233")).thenReturn(true);
        when(states.findAll()).thenReturn(Map.of());
        List<Dataset> order = new ArrayList<>();
        List<Integer> remaining = new ArrayList<>();
        everyDatasetSpends(6, order, remaining);

        DatasetRefreshSummary summary = processor.refreshAll(FIRED);

        assertThat(order).containsExactlyElementsOf(Dataset.inRunOrder());
        assertThat(remaining.subList(0, 3)).containsExactly(100, 94, 88);
        assertThat(summary.apiCalls()).isEqualTo(90);
        assertThat(summary.count(DatasetRefreshResult.UNCHANGED)).isEqualTo(15);
        verify(metrics).apiCalls(90);
        verify(metrics, times(15)).slot(any(), eq(DatasetRefreshResult.UNCHANGED));
        verify(metrics).runFinished(FINISHED);
    }

    @Test
    void storedStatesArePassedInAndOnlyChangedStatesAreSaved() {
        DatasetRefreshState stored = DatasetRefreshState.initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED, 1650);
        DatasetRefreshState probed = DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL).probedWithoutRows(FIRED);
        when(spatialReleases.isReady("legacy-20233")).thenReturn(true);
        when(states.findAll()).thenReturn(Map.of(Dataset.CHANGE_COMMERCIAL, stored));
        when(datasets.refresh(any(), any(), any(ApiCallBudget.class), eq(FIRED))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            DatasetRefreshState after = dataset == Dataset.STORE_COMMERCIAL ? probed : invocation.getArgument(1);
            return new DatasetRefreshOutcome(dataset, List.of(), 0, after);
        });

        processor.refreshAll(FIRED);

        verify(datasets).refresh(eq(Dataset.CHANGE_COMMERCIAL), eq(stored), any(ApiCallBudget.class), eq(FIRED));
        verify(datasets).refresh(eq(Dataset.STORE_COMMERCIAL), eq(DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL)), any(ApiCallBudget.class),
            eq(FIRED));
        verify(states, times(1)).save(any());
        verify(states).save(probed);
    }

    /**
     * JVM 오류(OutOfMemoryError)는 삼키지 않는다. 그래도 그때까지의 판단·쓴 예산·마지막 run 시각은 남겨, 매일 같은 데이터셋에서
     * 끊기는 것이 메트릭에 보이게 한다.
     */
    @Test
    void fatalErrorStillReportsWhatWasDecidedSoFar() {
        when(spatialReleases.isReady("legacy-20233")).thenReturn(true);
        when(states.findAll()).thenReturn(Map.of());
        Dataset first = Dataset.inRunOrder().getFirst();
        when(datasets.refresh(any(), any(), any(ApiCallBudget.class), eq(FIRED))).thenAnswer(invocation -> {
            Dataset dataset = invocation.getArgument(0);
            if (dataset != first) {
                throw new OutOfMemoryError("Java heap space");
            }
            ((ApiCallBudget) invocation.getArgument(2)).spend();
            return new DatasetRefreshOutcome(dataset, List.of(new DatasetRefreshSlot(dataset, null, DatasetRefreshResult.UNCHANGED, "")), 1,
                invocation.getArgument(1));
        });

        assertThatThrownBy(() -> processor.refreshAll(FIRED)).isInstanceOf(OutOfMemoryError.class);

        verify(metrics).slot(first, DatasetRefreshResult.UNCHANGED);
        verify(metrics).apiCalls(1);
        verify(metrics).runFinished(FINISHED);
    }

    @Test
    void stateTableFailureStillMarksTheRunAsFinished() {
        when(spatialReleases.isReady("legacy-20233")).thenReturn(true);
        when(states.findAll()).thenThrow(new IllegalStateException("Table 'dataset_refresh_state' doesn't exist"));

        assertThatThrownBy(() -> processor.refreshAll(FIRED)).isInstanceOf(IllegalStateException.class);

        verify(metrics).apiCalls(0);
        verify(metrics).runFinished(FINISHED);
    }
}
