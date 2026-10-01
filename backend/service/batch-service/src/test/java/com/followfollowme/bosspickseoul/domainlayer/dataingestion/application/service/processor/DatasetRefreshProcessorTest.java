package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ApiCallBudget;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshOutcome;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportExecution;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PublishedSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceAcquisition;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetImportExecutionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshMetricsPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * 데이터셋 1종 판단 행렬. 포트는 모두 모의 객체이고, 실제 검증·게시는 Job 쪽 테스트가 이미 고정한다.
 * 원천 모의 객체는 실제 어댑터처럼 시도마다 {@link ApiCallBudget} 을 쓴다.
 */
class DatasetRefreshProcessorTest {

    private static final String SPATIAL = "legacy-20233";
    private static final String RAW = "/app/data/raw/auto-fetch-1";
    private static final Instant FIRED = Instant.parse("2026-09-29T20:00:00Z"); // 2026-09-30 05:00 KST
    private static final Quarter Q20231 = new Quarter("20231");
    private static final Quarter Q20261 = new Quarter("20261");
    private static final Quarter Q20262 = new Quarter("20262");
    private static final Quarter Q20263 = new Quarter("20263");

    private final DatasetReleasePort releases = mock(DatasetReleasePort.class);
    private final TypedFactProjectionPort projections = mock(TypedFactProjectionPort.class);
    private final DatasetSourcePort source = mock(DatasetSourcePort.class);
    private final DatasetImportExecutionPort executions = mock(DatasetImportExecutionPort.class);
    private final DatasetRefreshMetricsPort metrics = mock(DatasetRefreshMetricsPort.class);

    private DatasetRefreshProcessor processor(boolean publish) {
        return processor(publish, 1);
    }

    private DatasetRefreshProcessor processor(boolean publish, int maxQuarters) {
        DatasetRefreshProperties properties = new DatasetRefreshProperties(true, null, publish, SPATIAL, "seoul-v1", 600, maxQuarters, 0.2, 7, null);
        return new DatasetRefreshProcessor(releases, projections, source, executions, metrics, properties);
    }

    private static DatasetRefreshOutcome refresh(DatasetRefreshProcessor processor, Dataset dataset, DatasetRefreshState state) {
        return processor.refresh(dataset, state, ApiCallBudget.of(600), FIRED);
    }

    private static DatasetRefreshState initial(Dataset dataset) {
        return DatasetRefreshState.initial(dataset);
    }

    /** 게시 슬롯과, 그 슬롯이 모두 이관돼 있는(typed == accepted) 상태. */
    private void published(Dataset dataset, PublishedSlot... slots) {
        Map<Quarter, Long> typed = new TreeMap<>();
        for (PublishedSlot slot : slots) {
            typed.put(slot.period(), slot.acceptedCount());
        }
        published(dataset, typed, slots);
    }

    private void published(Dataset dataset, Map<Quarter, Long> typed, PublishedSlot... slots) {
        when(releases.publishedSlots(dataset, SPATIAL, "seoul-v1")).thenReturn(List.of(slots));
        when(projections.typedRowCounts(eq(dataset), eq(SPATIAL), any())).thenReturn(typed);
    }

    private static PublishedSlot slot(Quarter quarter, long accepted) {
        return new PublishedSlot(quarter, "run-" + quarter.value(), accepted);
    }

    /** 실제 어댑터처럼 한 번 쓰고 결과를 준다. {@code total} 이 null 이면 그 분기 데이터가 없다. */
    private void probe(Dataset dataset, Quarter quarter, Long total) {
        when(source.probe(eq(dataset), eq(quarter), any())).thenAnswer(invocation -> {
            ((ApiCallBudget) invocation.getArgument(2)).spend();
            return Optional.ofNullable(total);
        });
    }

    private void acquire(Dataset dataset, Quarter quarter, Map<Quarter, Long> rows, int calls) {
        when(source.acquire(eq(dataset), eq(quarter), anyString(), any())).thenAnswer(invocation -> {
            ApiCallBudget budget = invocation.getArgument(3);
            for (int call = 0; call < calls; call++) {
                budget.spend();
            }
            return new SourceAcquisition(RAW, new TreeMap<>(rows), rows.values().stream().mapToLong(Long::longValue).sum());
        });
    }

    private void jobsSucceed() {
        when(executions.runFacts(any())).thenReturn(ImportExecution.completed(0));
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(0));
    }

    private static List<DatasetRefreshResult> results(DatasetRefreshOutcome outcome) {
        return outcome.slots().stream().map(DatasetRefreshSlot::result).toList();
    }

    @Test
    void noPublishedQuarterIsLeftToTheManualCliAndCostsNoApiCall() {
        published(Dataset.SALES_COMMERCIAL);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NO_BASELINE);
        assertThat(outcome.apiCalls()).isZero();
        verifyNoInteractions(source, executions);
    }

    @Test
    void discontinuedDatasetStopsWithoutCallingTheApi() {
        published(Dataset.CONSUMPTION_COMMERCIAL, slot(new Quarter("20234"), 1650));

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.CONSUMPTION_COMMERCIAL, initial(Dataset.CONSUMPTION_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.DISCONTINUED);
        verifyNoInteractions(source, executions);
    }

    @Test
    void recentFailureCoolsDownButAnExpiredOneRetries() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 21910));
        DatasetRefreshState failedYesterday = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(1)), "x");

        assertThat(results(refresh(processor(true), Dataset.SALES_COMMERCIAL, failedYesterday))).containsExactly(DatasetRefreshResult.COOLDOWN);
        verifyNoInteractions(source);

        probe(Dataset.SALES_COMMERCIAL, Q20262, null);
        DatasetRefreshState failedLongAgo = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(8)), "x");
        assertThat(results(refresh(processor(true), Dataset.SALES_COMMERCIAL, failedLongAgo)))
            .containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
    }

    @Test
    void exhaustedBudgetSkipsBeforeProbing() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 21910));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL), ApiCallBudget.of(0), FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.BUDGET);
        verifyNoInteractions(source);
    }

    @Test
    void honouredDatasetWithNoRowsForTheNextQuarterIsNotPublishedYet() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 21910));
        probe(Dataset.SALES_COMMERCIAL, Q20262, null);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        assertThat(outcome.state().lastProbeAt()).isEqualTo(FIRED);
        verify(source, never()).acquire(any(), any(), anyString(), any());
    }

    @Test
    void ignoredDatasetWithAnUnchangedTotalIsNotDownloadedAgain() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20262, 25));
        probe(Dataset.CHANGE_DISTRICT, Q20263, 550L);
        DatasetRefreshState state = initial(Dataset.CHANGE_DISTRICT).probed(FIRED.minus(Duration.ofDays(1)), 550)
            .fetched("auto-old", "/raw/old", Q20262);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.CHANGE_DISTRICT, state);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.UNCHANGED);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        verify(source, never()).acquire(any(), any(), anyString(), any());
    }

    /** 합계가 같아도 지난번에 본 최신 분기가 아직 게시되지 않았으면(분기 상한·게시 전환 직후) 다시 받는다. */
    @Test
    void ignoredDatasetWithPendingQuartersIsDownloadedAgainWhenPublishing() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20261, 25));
        probe(Dataset.CHANGE_DISTRICT, Q20262, 550L);
        acquire(Dataset.CHANGE_DISTRICT, Q20262, Map.of(Q20261, 25L, Q20262, 25L), 1);
        jobsSucceed();
        DatasetRefreshState state = initial(Dataset.CHANGE_DISTRICT).probed(FIRED.minus(Duration.ofDays(1)), 550)
            .fetched("auto-old", "/raw/old", Q20262);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.CHANGE_DISTRICT, state);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED);
    }

    /** 분기 인자를 존중하는 데이터셋은 합계가 분기별이다. CHANGE_COMMERCIAL 은 늘 1650 이라 합계만 보면 새 분기를 놓친다. */
    @Test
    void honouredDatasetIsNotSkippedJustBecauseTheTotalMatchesAnotherQuarter() {
        published(Dataset.CHANGE_COMMERCIAL, slot(Q20261, 1650));
        probe(Dataset.CHANGE_COMMERCIAL, Q20262, 1650L);
        acquire(Dataset.CHANGE_COMMERCIAL, Q20262, Map.of(Q20262, 1650L), 2);
        jobsSucceed();
        DatasetRefreshState state = initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED.minus(Duration.ofDays(90)), 1650)
            .fetched("auto-old", "/raw/old", Q20261);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.CHANGE_COMMERCIAL, state);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED);
        assertThat(outcome.apiCalls()).isEqualTo(3);
    }

    @Test
    void honouredDatasetAlreadyDryRunForTheSameCandidateIsUnchangedWhilePublishIsOff() {
        published(Dataset.CHANGE_COMMERCIAL, slot(Q20261, 1650));
        probe(Dataset.CHANGE_COMMERCIAL, Q20262, 1650L);
        DatasetRefreshState state = initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED.minus(Duration.ofDays(1)), 1650)
            .fetched("auto-old", "/raw/old", Q20262);

        assertThat(results(refresh(processor(false), Dataset.CHANGE_COMMERCIAL, state))).containsExactly(DatasetRefreshResult.UNCHANGED);
    }

    @Test
    void downloadThatWouldExceedTheBudgetIsSkipped() {
        published(Dataset.STORE_COMMERCIAL, slot(Q20261, 77025));
        probe(Dataset.STORE_COMMERCIAL, Q20262, 77100L);

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.STORE_COMMERCIAL, initial(Dataset.STORE_COMMERCIAL), ApiCallBudget.of(50), FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.BUDGET);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        verify(source, never()).acquire(any(), any(), anyString(), any());
    }

    /** 탐지 뒤 합계가 늘어 수집이 예산을 넘기려 하면 어댑터가 멈춘다. 원천 오류가 아니라 실패·쿨다운으로 세지 않는다. */
    @Test
    void budgetExhaustedDuringAcquisitionIsABudgetSkipWithExactCallCount() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString(), any())).thenAnswer(invocation -> {
            ApiCallBudget budget = invocation.getArgument(3);
            while (true) {
                budget.spend();
            }
        });

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL), ApiCallBudget.of(30), FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.BUDGET);
        assertThat(outcome.slots().getFirst().period()).isEqualTo(Q20262);
        assertThat(outcome.apiCalls()).isEqualTo(30);
        assertThat(outcome.state().consecutiveFailures()).isZero();
        assertThat(outcome.state().lastSourceTotal()).as("받다 만 합계는 기억하지 않는다").isNull();
        verifyNoInteractions(executions);
    }

    @Test
    void acquisitionWithoutANewerQuarterRemembersTheTotalForTomorrow() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20262, 25));
        probe(Dataset.CHANGE_DISTRICT, Q20263, 550L);
        acquire(Dataset.CHANGE_DISTRICT, Q20263, Map.of(Q20261, 25L, Q20262, 25L), 1);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.CHANGE_DISTRICT, initial(Dataset.CHANGE_DISTRICT));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        assertThat(outcome.state().lastSourceTotal()).isEqualTo(550L);
        assertThat(outcome.state().newestSourcePeriod()).isEqualTo(Q20262);
        verifyNoInteractions(executions);
    }

    /** IMPLAUSIBLE 이어도 보관본 위치를 남긴다. 운영자가 원인을 보고 이 경로를 수동 ARCHIVE 로 재생한다. */
    @Test
    void fixedRowCountMismatchIsImplausibleButKeepsTheArchiveForManualReplay() {
        published(Dataset.CHANGE_COMMERCIAL, slot(Q20261, 1650));
        probe(Dataset.CHANGE_COMMERCIAL, Q20262, 1649L);
        acquire(Dataset.CHANGE_COMMERCIAL, Q20262, Map.of(Q20262, 1649L), 2);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.CHANGE_COMMERCIAL, initial(Dataset.CHANGE_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.IMPLAUSIBLE);
        assertThat(outcome.state().consecutiveFailures()).isEqualTo(1);
        assertThat(outcome.state().lastSourceTotal()).as("실패한 합계는 기억하지 않는다").isNull();
        assertThat(outcome.state().newestSourcePeriod()).as("실패한 수집으로 최신 분기를 바꾸지 않는다").isNull();
        assertThat(outcome.state().lastFetchRunId()).isEqualTo("auto-change-commercial-20262-202609300500-fetch");
        assertThat(outcome.state().lastFetchRawLocation()).isEqualTo(RAW);
        verifyNoInteractions(executions);
    }

    @Test
    void rowCountOutsideTheToleranceOfThePreviousQuarterIsImplausible() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 24001L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 24001L), 25);

        assertThat(results(refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL))))
            .containsExactly(DatasetRefreshResult.IMPLAUSIBLE);
        verifyNoInteractions(executions);
    }

    @Test
    void publishOffStopsAfterADryRunReplayedFromTheArchive() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 21000L), 22);
        jobsSucceed();

        DatasetRefreshOutcome outcome = refresh(processor(false), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.WOULD_PUBLISH);
        assertThat(outcome.apiCalls()).isEqualTo(23);
        ArgumentCaptor<ImportRequest> captor = ArgumentCaptor.forClass(ImportRequest.class);
        verify(executions, times(1)).runFacts(captor.capture());
        ImportRequest dry = captor.getValue();
        assertThat(dry.dryRun()).isTrue();
        assertThat(dry.sourceType()).isEqualTo(ImportRequest.SourceType.ARCHIVE);
        assertThat(dry.sourceFile().toString()).endsWith("auto-fetch-1");
        assertThat(dry.expectedRows()).isEqualTo(21000);
        assertThat(dry.sourceUpdatedAt()).isEqualTo(Instant.parse("2026-06-30T00:00:00Z"));
        assertThat(dry.runId()).isEqualTo("auto-sales-commercial-20262-202609300500-dry");
        verify(executions, never()).runProjection(any());
        assertThat(outcome.state().consecutiveFailures()).isZero();
        assertThat(outcome.state().lastSourceTotal()).isEqualTo(21000L);
    }

    @Test
    void publishOnRunsDryRunThenPublishThenProjection() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 21000L), 22);
        jobsSucceed();
        DatasetRefreshState previouslyFailed = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(30)), "old");

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, previouslyFailed);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED);
        ArgumentCaptor<ImportRequest> facts = ArgumentCaptor.forClass(ImportRequest.class);
        verify(executions, times(2)).runFacts(facts.capture());
        assertThat(facts.getAllValues()).extracting(ImportRequest::dryRun).containsExactly(true, false);
        assertThat(facts.getAllValues().get(1).runId()).isEqualTo("auto-sales-commercial-20262-202609300500-pub");
        ArgumentCaptor<ProjectionRequest> projection = ArgumentCaptor.forClass(ProjectionRequest.class);
        verify(executions).runProjection(projection.capture());
        assertThat(projection.getValue().dryRun()).isFalse();
        assertThat(projection.getValue().runId()).isEqualTo("auto-project-sales-commercial-20262-202609300500");
        assertThat(outcome.state().consecutiveFailures()).isZero();
    }

    @Test
    void failedDryRunNeverPublishesButKeepsTheArchive() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 21000L), 22);
        when(executions.runFacts(any())).thenReturn(ImportExecution.failed("FAILED", "Dataset validation failed: expected=21000 input=21000 accepted=20990"));

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.FAILED);
        verify(executions, times(1)).runFacts(any());
        verify(executions, never()).runProjection(any());
        assertThat(outcome.state().lastFailureReason()).contains("accepted=20990");
        assertThat(outcome.state().lastFetchRawLocation()).isEqualTo(RAW);
    }

    /** 게시는 됐고 이관만 남았다. 쿨다운을 걸지 않아 다음 run 의 재이관이 바로 복구한다. */
    @Test
    void projectionFailureAfterPublishingIsReportedSeparatelyWithoutCooldown() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 21000L), 22);
        when(executions.runFacts(any())).thenReturn(ImportExecution.completed(0));
        when(executions.runProjection(any())).thenReturn(ImportExecution.failed("FAILED", "boom"));
        DatasetRefreshState failedBefore = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(30)), "old");

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, failedBefore);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED_NOT_PROJECTED);
        assertThat(outcome.state().consecutiveFailures()).isZero();
        assertThat(outcome.state().lastFailureAt()).isEqualTo(FIRED);
        assertThat(outcome.state().lastFailureReason()).contains("projection 20262").contains("boom");
    }

    @Test
    void ignoredDatasetPublishesOnlyUpToTheQuarterLimitInAscendingOrder() {
        published(Dataset.POPULATION_COMMERCIAL, slot(Q20261, 1650));
        probe(Dataset.POPULATION_COMMERCIAL, Q20262, 4950L);
        acquire(Dataset.POPULATION_COMMERCIAL, Q20262, Map.of(Q20261, 1650L, Q20262, 1650L, Q20263, 1650L), 5);
        jobsSucceed();

        DatasetRefreshOutcome oneAtATime = refresh(processor(true, 1), Dataset.POPULATION_COMMERCIAL, initial(Dataset.POPULATION_COMMERCIAL));
        assertThat(oneAtATime.slots()).extracting(DatasetRefreshSlot::period).containsExactly(Q20262);

        DatasetRefreshOutcome two = refresh(processor(true, 2), Dataset.POPULATION_COMMERCIAL, initial(Dataset.POPULATION_COMMERCIAL));
        assertThat(two.slots()).extracting(DatasetRefreshSlot::period).containsExactly(Q20262, Q20263);
        assertThat(two.slots()).extracting(DatasetRefreshSlot::result).containsOnly(DatasetRefreshResult.PUBLISHED);
    }

    /** 재이관과 새 분기는 합쳐 max-quarters-per-run 을 넘지 않는다(상시 컨테이너 메모리). */
    @Test
    void reprojectionAndNewQuartersShareTheQuarterLimit() {
        published(Dataset.SALES_COMMERCIAL, Map.of(), slot(Q20261, 20000));
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(3));

        DatasetRefreshOutcome outcome = refresh(processor(false), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.WOULD_PROJECT, DatasetRefreshResult.BUDGET);
        assertThat(outcome.slots().get(1).detail()).contains("max-quarters-per-run=1");
        ArgumentCaptor<ProjectionRequest> projection = ArgumentCaptor.forClass(ProjectionRequest.class);
        verify(executions).runProjection(projection.capture());
        assertThat(projection.getValue().dryRun()).isTrue();
        assertThat(projection.getValue().period()).isEqualTo(Q20261);
        verify(metrics).serviceTypeUnresolved(Dataset.SALES_COMMERCIAL, 3);
        verifyNoInteractions(source);

        probe(Dataset.SALES_COMMERCIAL, Q20262, null);
        DatasetRefreshOutcome withRoom = refresh(processor(false, 2), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));
        assertThat(results(withRoom)).containsExactly(DatasetRefreshResult.WOULD_PROJECT, DatasetRefreshResult.NOT_PUBLISHED_YET);
    }

    /** 20211~20233 은 legacy-20233 레거시 행이 이관 없이 이미 있다. 건수가 어긋나도 자동으로 덮어쓰지 않는다. */
    @Test
    void slotsBeforeTheAutomationFloorAreNeverReprojected() {
        published(Dataset.SALES_COMMERCIAL, Map.of(Q20261, 20000L), slot(Q20231, 18000), slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, null);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        verify(executions, never()).runProjection(any());
        verify(projections).typedRowCounts(Dataset.SALES_COMMERCIAL, SPATIAL, new Quarter("20234"));
    }

    /**
     * 새 분기 게시도 하한(automation-from, 기본 20234)을 지킨다. 마지막 게시가 20232 이하면 다음 분기가 레거시 분기라 publish=true 에서
     * 자동으로 게시·이관하면 legacy-20233 레거시 행을 덮는다. API 를 부르지 않고 수동 백필로 넘긴다.
     */
    @Test
    void candidateBeforeTheAutomationFloorIsLeftToTheManualBackfill() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20231, 18000));

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.BELOW_AUTOMATION_FLOOR);
        assertThat(outcome.slots().getFirst().period()).isEqualTo(new Quarter("20232"));
        assertThat(outcome.slots().getFirst().detail()).contains("automation-from=20234");
        assertThat(outcome.apiCalls()).isZero();
        assertThat(outcome.state()).isEqualTo(initial(Dataset.SALES_COMMERCIAL));
        verify(projections, never()).typedRowCounts(any(), any(), any());
        verifyNoInteractions(source, executions);
    }

    /** 마지막 게시가 20233 이면 후보 20234 부터는 자동 최신화 대상이다. */
    @Test
    void lastLegacyQuarterPublishedMakesTheNextQuarterEligible() {
        published(Dataset.SALES_COMMERCIAL, slot(new Quarter("20233"), 18000));
        probe(Dataset.SALES_COMMERCIAL, new Quarter("20234"), null);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        assertThat(outcome.apiCalls()).isEqualTo(1);
    }

    /** 재이관도 쿨다운을 따른다. 매일 실패하는 무거운 이관을 매일 다시 돌리지 않는다. */
    @Test
    void reprojectionWaitsForTheCooldown() {
        published(Dataset.SALES_COMMERCIAL, Map.of(), slot(Q20261, 20000));
        DatasetRefreshState failedYesterday = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(1)), "x");

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, failedYesterday);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.COOLDOWN);
        verifyNoInteractions(executions, source);
    }

    @Test
    void successfulReprojectionClearsTheFailureStreak() {
        published(Dataset.SALES_COMMERCIAL, Map.of(), slot(Q20261, 20000));
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(0));
        DatasetRefreshState failedLongAgo = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(8)), "old");

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, failedLongAgo);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PROJECTED, DatasetRefreshResult.BUDGET);
        assertThat(outcome.state().consecutiveFailures()).isZero();
        assertThat(outcome.state().lastFailureReason()).as("원인은 운영자가 읽도록 남긴다").isEqualTo("old");
    }

    /** publish=false 로 오래 돌려도 같은 슬롯을 매일 dry-run 이관하지 않는다. 다음 어긋난 슬롯으로 넘어간다. */
    @Test
    void publishOffDryRunsEachMismatchedSlotOnlyOnce() {
        published(Dataset.SALES_COMMERCIAL, Map.of(), slot(Q20261, 20000), slot(Q20262, 20500));
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(0));
        DatasetRefreshProcessor processor = processor(false);

        DatasetRefreshOutcome first = refresh(processor, Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));
        DatasetRefreshOutcome second = refresh(processor, Dataset.SALES_COMMERCIAL, first.state());
        probe(Dataset.SALES_COMMERCIAL, Q20263, null);
        DatasetRefreshOutcome third = refresh(processor, Dataset.SALES_COMMERCIAL, second.state());

        assertThat(first.slots().getFirst().period()).isEqualTo(Q20261);
        assertThat(first.state().lastReprojectDryRunPeriod()).isEqualTo(Q20261);
        assertThat(second.slots().getFirst().period()).isEqualTo(Q20262);
        assertThat(second.state().lastReprojectDryRunPeriod()).isEqualTo(Q20262);
        assertThat(results(third)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        verify(executions, times(2)).runProjection(any());
    }

    @Test
    void publishOnReprojectsEvenSlotsAlreadyDryRun() {
        published(Dataset.SALES_COMMERCIAL, Map.of(), slot(Q20261, 20000));
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(0));
        DatasetRefreshState dryRunDone = initial(Dataset.SALES_COMMERCIAL).reprojectDryRun(Q20261);

        assertThat(results(refresh(processor(true), Dataset.SALES_COMMERCIAL, dryRunDone)))
            .containsExactly(DatasetRefreshResult.PROJECTED, DatasetRefreshResult.BUDGET);
    }

    @Test
    void sourceErrorIsRecordedAsAFailureInsteadOfEscaping() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), any())).thenAnswer(invocation -> {
            ((ApiCallBudget) invocation.getArgument(2)).spend();
            throw new IllegalStateException("Seoul API unavailable after bounded retries");
        });

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.FAILED);
        assertThat(outcome.slots().getFirst().period()).isEqualTo(Q20262);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        assertThat(outcome.state().consecutiveFailures()).isEqualTo(1);
        assertThat(outcome.state().lastFailureReason()).contains("Seoul API unavailable");
    }

    /** JVM 오류가 아닌 Error(링크 오류 등)도 데이터셋 하나의 실패로 흡수해 뒤 데이터셋을 막지 않는다. */
    @Test
    void nonFatalErrorIsAbsorbedAsAFailure() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), any())).thenThrow(new NoClassDefFoundError("x/Y"));

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.FAILED);
        assertThat(outcome.state().lastFailureReason()).contains("NoClassDefFoundError");
    }

    @Test
    void outOfMemoryErrorIsNeverSwallowed() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), any())).thenThrow(new OutOfMemoryError("Java heap space"));

        assertThatThrownBy(() -> refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL)))
            .isInstanceOf(OutOfMemoryError.class);
    }

    /** 분기 인자를 무시하는 9종은 publish=false 면 지난번 최신 분기가 게시본보다 늦어도 합계가 같으면 다시 받지 않는다(이미 dry-run 했다). */
    @Test
    void ignoredDatasetWithAnUnchangedTotalIsUnchangedWhilePublishIsOffEvenIfNewerQuartersArePending() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20261, 25));
        probe(Dataset.CHANGE_DISTRICT, Q20262, 550L);
        DatasetRefreshState seenNewer = initial(Dataset.CHANGE_DISTRICT).probed(FIRED.minus(Duration.ofDays(1)), 550)
            .fetched("auto-old", "/raw/old", Q20263);

        DatasetRefreshOutcome outcome = refresh(processor(false), Dataset.CHANGE_DISTRICT, seenNewer);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.UNCHANGED);
        verify(source, never()).acquire(any(), any(), anyString(), any());
    }

    @Test
    void reprojectionWithPublishOnIsARealProjection() {
        published(Dataset.SALES_COMMERCIAL, Map.of(Q20261, 19000L), slot(Q20261, 20000));
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(0));

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PROJECTED, DatasetRefreshResult.BUDGET);
        assertThat(outcome.slots().getFirst().detail()).isEqualTo("typed=19000 accepted=20000");
        ArgumentCaptor<ProjectionRequest> projection = ArgumentCaptor.forClass(ProjectionRequest.class);
        verify(executions).runProjection(projection.capture());
        assertThat(projection.getValue().dryRun()).isFalse();
        assertThat(projection.getValue().period()).isEqualTo(Q20261);
        assertThat(projection.getValue().runId()).isEqualTo("auto-project-sales-commercial-20261-202609300500");
        assertThat(outcome.state().lastReprojectDryRunPeriod()).as("실이관은 dry-run 표시를 남기지 않는다").isNull();
    }

    /** 재이관이 실패하면 쿨다운에 들어가 다음 날은 이관하지 않고, 쿨다운이 끝나면 다시 이관한다. */
    @Test
    void failedReprojectionCoolsDownBeforeItIsRetried() {
        published(Dataset.SALES_COMMERCIAL, Map.of(), slot(Q20261, 20000));
        when(executions.runProjection(any())).thenReturn(ImportExecution.failed("FAILED", "Java heap space"), ImportExecution.completed(0));
        DatasetRefreshProcessor processor = processor(true);

        DatasetRefreshOutcome day1 = refresh(processor, Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));
        DatasetRefreshOutcome day2 = processor.refresh(Dataset.SALES_COMMERCIAL, day1.state(), ApiCallBudget.of(600), FIRED.plus(Duration.ofDays(1)));
        DatasetRefreshOutcome day8 = processor.refresh(Dataset.SALES_COMMERCIAL, day2.state(), ApiCallBudget.of(600), FIRED.plus(Duration.ofDays(8)));

        assertThat(results(day1)).containsExactly(DatasetRefreshResult.FAILED);
        assertThat(day1.state().consecutiveFailures()).isEqualTo(1);
        assertThat(results(day2)).containsExactly(DatasetRefreshResult.COOLDOWN);
        assertThat(results(day8)).containsExactly(DatasetRefreshResult.PROJECTED, DatasetRefreshResult.BUDGET);
        assertThat(day8.state().consecutiveFailures()).isZero();
        verify(executions, times(2)).runProjection(any());
        verifyNoInteractions(source);
    }

    /** 게시 뒤 이관만 실패한 분기는 다음 날 재이관이 바로 복구하고, 그 데이터셋은 연속 실패 없이 정상으로 돌아온다. */
    @Test
    void publishedButNotProjectedQuarterIsRecoveredTheNextDay() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 21000L), 22);
        when(executions.runFacts(any())).thenReturn(ImportExecution.completed(0));
        when(executions.runProjection(any())).thenReturn(ImportExecution.failed("FAILED", "boom"), ImportExecution.completed(0));
        DatasetRefreshProcessor processor = processor(true);
        DatasetRefreshState failedBefore = initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(20)), "old");

        DatasetRefreshOutcome day1 = refresh(processor, Dataset.SALES_COMMERCIAL, failedBefore);
        // 다음 날: 20262 가 게시돼 있고 typed 행이 없다(이관 실패).
        published(Dataset.SALES_COMMERCIAL, Map.of(Q20261, 20000L), slot(Q20261, 20000), slot(Q20262, 21000));
        DatasetRefreshOutcome day2 = processor.refresh(Dataset.SALES_COMMERCIAL, day1.state(), ApiCallBudget.of(600), FIRED.plus(Duration.ofDays(1)));

        assertThat(results(day1)).containsExactly(DatasetRefreshResult.PUBLISHED_NOT_PROJECTED);
        assertThat(results(day2)).containsExactly(DatasetRefreshResult.PROJECTED, DatasetRefreshResult.BUDGET);
        assertThat(day2.slots().getFirst().period()).isEqualTo(Q20262);
        assertThat(day2.state().consecutiveFailures()).isZero();
    }

    /** 수집이 몇 페이지 받다가 원천 오류로 끝나도 그때까지 쓴 호출이 예산에 남는다. 다음 데이터셋이 그만큼 덜 쓴다. */
    @Test
    void acquisitionFailingMidwayStillChargesTheCallsItMade() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString(), any())).thenAnswer(invocation -> {
            ApiCallBudget budget = invocation.getArgument(3);
            for (int call = 0; call < 5; call++) {
                budget.spend();
            }
            throw new IllegalArgumentException("API row count changed during pagination");
        });
        ApiCallBudget budget = ApiCallBudget.of(600);

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL), budget, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.FAILED);
        assertThat(outcome.apiCalls()).isEqualTo(6);
        assertThat(budget.remaining()).isEqualTo(594);
        assertThat(outcome.state().consecutiveFailures()).isEqualTo(1);
        verifyNoInteractions(executions);
    }

    /** 고정 행 수가 없는 데이터셋은 직전 분기 게시 행 수로 판단한다. 그 기준이 0 이하면 비교할 수 없어 게시하지 않는다. */
    @Test
    void nonPositiveBaselineIsImplausible() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 0));
        probe(Dataset.SALES_COMMERCIAL, Q20262, 21000L);
        acquire(Dataset.SALES_COMMERCIAL, Q20262, Map.of(Q20262, 21000L), 22);

        DatasetRefreshOutcome outcome = refresh(processor(true), Dataset.SALES_COMMERCIAL, initial(Dataset.SALES_COMMERCIAL));

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.IMPLAUSIBLE);
        assertThat(outcome.slots().getFirst().detail()).isEqualTo("expected=21000 baseline=0");
        verifyNoInteractions(executions);
    }

    @Test
    void generatedRunIdsFitTheBatchIdentifierRuleForEveryDataset() {
        List<String> runIds = new ArrayList<>();
        for (Dataset dataset : Dataset.values()) {
            runIds.add(DatasetRefreshProcessor.runId("", dataset, Q20262, FIRED, "-fetch"));
            runIds.add(DatasetRefreshProcessor.runId("project-", dataset, Q20262, FIRED, ""));
        }
        assertThat(runIds).allSatisfy(runId -> {
            assertThat(runId).matches("[a-zA-Z0-9_-]{1,64}").startsWith("auto-");
            assertThat(runId.length()).isLessThanOrEqualTo(64);
        });
        assertThat(DatasetRefreshProcessor.runId("", Dataset.CONSUMPTION_ADMINISTRATION, Q20262, FIRED, "-fetch"))
            .isEqualTo("auto-consumption-administration-20262-202609300500-fetch");
    }
}
