package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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
 */
class DatasetRefreshProcessorTest {

    private static final String SPATIAL = "legacy-20233";
    private static final Instant FIRED = Instant.parse("2026-09-29T20:00:00Z"); // 2026-09-30 05:00 KST
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
        DatasetRefreshProperties properties = new DatasetRefreshProperties(true, null, publish, SPATIAL, "seoul-v1", 600, maxQuarters, 0.2, 7);
        return new DatasetRefreshProcessor(releases, projections, source, executions, metrics, properties);
    }

    private void published(Dataset dataset, PublishedSlot... slots) {
        when(releases.publishedSlots(dataset, SPATIAL, "seoul-v1")).thenReturn(List.of(slots));
        Map<Quarter, Long> typed = new TreeMap<>();
        for (PublishedSlot slot : slots) {
            typed.put(slot.period(), slot.acceptedCount());
        }
        when(projections.typedRowCounts(dataset, SPATIAL)).thenReturn(typed);
    }

    private static PublishedSlot slot(Quarter quarter, long accepted) {
        return new PublishedSlot(quarter, "run-" + quarter.value(), accepted);
    }

    private static SourceAcquisition acquisition(Map<Quarter, Long> rows, int calls) {
        return new SourceAcquisition("/app/data/raw/auto-fetch-1", new TreeMap<>(rows), calls, rows.values().stream().mapToLong(Long::longValue).sum());
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

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NO_BASELINE);
        assertThat(outcome.apiCalls()).isZero();
        verifyNoInteractions(source, executions);
    }

    @Test
    void discontinuedDatasetStopsWithoutCallingTheApi() {
        published(Dataset.CONSUMPTION_COMMERCIAL, slot(new Quarter("20234"), 1650));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.CONSUMPTION_COMMERCIAL,
            DatasetRefreshState.initial(Dataset.CONSUMPTION_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.DISCONTINUED);
        verifyNoInteractions(source, executions);
    }

    @Test
    void recentFailureCoolsDownButAnExpiredOneRetries() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 21910));
        DatasetRefreshState failedYesterday = DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(1)), "x");

        assertThat(results(processor(true).refresh(Dataset.SALES_COMMERCIAL, failedYesterday, 600, FIRED)))
            .containsExactly(DatasetRefreshResult.COOLDOWN);
        verifyNoInteractions(source);

        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.empty());
        DatasetRefreshState failedLongAgo = DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(8)), "x");
        assertThat(results(processor(true).refresh(Dataset.SALES_COMMERCIAL, failedLongAgo, 600, FIRED)))
            .containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
    }

    @Test
    void exhaustedBudgetSkipsBeforeProbing() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 21910));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 0, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.BUDGET);
        verifyNoInteractions(source);
    }

    @Test
    void honouredDatasetWithNoRowsForTheNextQuarterIsNotPublishedYet() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 21910));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.empty());

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        assertThat(outcome.state().lastProbeAt()).isEqualTo(FIRED);
        verify(source, never()).acquire(any(), any(), anyString());
    }

    @Test
    void ignoredDatasetWithAnUnchangedTotalIsNotDownloadedAgain() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20262, 25));
        when(source.probe(Dataset.CHANGE_DISTRICT, Q20263)).thenReturn(Optional.of(550L));
        DatasetRefreshState state = DatasetRefreshState.initial(Dataset.CHANGE_DISTRICT).probed(FIRED.minus(Duration.ofDays(1)), 550)
            .fetched("auto-old", "/raw/old", Q20262);

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.CHANGE_DISTRICT, state, 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.UNCHANGED);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        verify(source, never()).acquire(any(), any(), anyString());
    }

    /** 합계가 같아도 지난번에 본 최신 분기가 아직 게시되지 않았으면(분기 상한·게시 전환 직후) 다시 받는다. */
    @Test
    void ignoredDatasetWithPendingQuartersIsDownloadedAgainWhenPublishing() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20261, 25));
        when(source.probe(Dataset.CHANGE_DISTRICT, Q20262)).thenReturn(Optional.of(550L));
        when(source.acquire(eq(Dataset.CHANGE_DISTRICT), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20261, 25L, Q20262, 25L), 1));
        jobsSucceed();
        DatasetRefreshState state = DatasetRefreshState.initial(Dataset.CHANGE_DISTRICT).probed(FIRED.minus(Duration.ofDays(1)), 550)
            .fetched("auto-old", "/raw/old", Q20262);

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.CHANGE_DISTRICT, state, 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED);
    }

    /** 분기 인자를 존중하는 데이터셋은 합계가 분기별이다. CHANGE_COMMERCIAL 은 늘 1650 이라 합계만 보면 새 분기를 놓친다. */
    @Test
    void honouredDatasetIsNotSkippedJustBecauseTheTotalMatchesAnotherQuarter() {
        published(Dataset.CHANGE_COMMERCIAL, slot(Q20261, 1650));
        when(source.probe(Dataset.CHANGE_COMMERCIAL, Q20262)).thenReturn(Optional.of(1650L));
        when(source.acquire(eq(Dataset.CHANGE_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 1650L), 2));
        jobsSucceed();
        DatasetRefreshState state = DatasetRefreshState.initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED.minus(Duration.ofDays(90)), 1650)
            .fetched("auto-old", "/raw/old", Q20261);

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.CHANGE_COMMERCIAL, state, 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED);
        assertThat(outcome.apiCalls()).isEqualTo(3);
    }

    @Test
    void honouredDatasetAlreadyDryRunForTheSameCandidateIsUnchangedWhilePublishIsOff() {
        published(Dataset.CHANGE_COMMERCIAL, slot(Q20261, 1650));
        when(source.probe(Dataset.CHANGE_COMMERCIAL, Q20262)).thenReturn(Optional.of(1650L));
        DatasetRefreshState state = DatasetRefreshState.initial(Dataset.CHANGE_COMMERCIAL).probed(FIRED.minus(Duration.ofDays(1)), 1650)
            .fetched("auto-old", "/raw/old", Q20262);

        assertThat(results(processor(false).refresh(Dataset.CHANGE_COMMERCIAL, state, 600, FIRED)))
            .containsExactly(DatasetRefreshResult.UNCHANGED);
    }

    @Test
    void downloadThatWouldExceedTheBudgetIsSkipped() {
        published(Dataset.STORE_COMMERCIAL, slot(Q20261, 77025));
        when(source.probe(Dataset.STORE_COMMERCIAL, Q20262)).thenReturn(Optional.of(77100L));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.STORE_COMMERCIAL, DatasetRefreshState.initial(Dataset.STORE_COMMERCIAL), 50, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.BUDGET);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        verify(source, never()).acquire(any(), any(), anyString());
    }

    @Test
    void acquisitionWithoutANewerQuarterRemembersTheTotalForTomorrow() {
        published(Dataset.CHANGE_DISTRICT, slot(Q20262, 25));
        when(source.probe(Dataset.CHANGE_DISTRICT, Q20263)).thenReturn(Optional.of(550L));
        when(source.acquire(eq(Dataset.CHANGE_DISTRICT), eq(Q20263), anyString())).thenReturn(acquisition(Map.of(Q20261, 25L, Q20262, 25L), 1));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.CHANGE_DISTRICT, DatasetRefreshState.initial(Dataset.CHANGE_DISTRICT), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.NOT_PUBLISHED_YET);
        assertThat(outcome.state().lastSourceTotal()).isEqualTo(550L);
        assertThat(outcome.state().newestSourcePeriod()).isEqualTo(Q20262);
        verifyNoInteractions(executions);
    }

    @Test
    void fixedRowCountMismatchIsImplausibleAndPublishesNothing() {
        published(Dataset.CHANGE_COMMERCIAL, slot(Q20261, 1650));
        when(source.probe(Dataset.CHANGE_COMMERCIAL, Q20262)).thenReturn(Optional.of(1649L));
        when(source.acquire(eq(Dataset.CHANGE_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 1649L), 2));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.CHANGE_COMMERCIAL, DatasetRefreshState.initial(Dataset.CHANGE_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.IMPLAUSIBLE);
        assertThat(outcome.state().consecutiveFailures()).isEqualTo(1);
        assertThat(outcome.state().lastSourceTotal()).as("실패한 합계는 기억하지 않는다").isNull();
        verifyNoInteractions(executions);
    }

    @Test
    void rowCountOutsideTheToleranceOfThePreviousQuarterIsImplausible() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.of(24001L));
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 24001L), 25));

        assertThat(results(processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED)))
            .containsExactly(DatasetRefreshResult.IMPLAUSIBLE);
        verifyNoInteractions(executions);
    }

    @Test
    void publishOffStopsAfterADryRunReplayedFromTheArchive() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.of(21000L));
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 21000L), 22));
        jobsSucceed();

        DatasetRefreshOutcome outcome = processor(false).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

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
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.of(21000L));
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 21000L), 22));
        jobsSucceed();
        DatasetRefreshState previouslyFailed = DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL).failed(FIRED.minus(Duration.ofDays(30)), "old");

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, previouslyFailed, 600, FIRED);

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
    void failedDryRunNeverPublishes() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.of(21000L));
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 21000L), 22));
        when(executions.runFacts(any())).thenReturn(ImportExecution.failed("FAILED", "Dataset validation failed: expected=21000 input=21000 accepted=20990"));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.FAILED);
        verify(executions, times(1)).runFacts(any());
        verify(executions, never()).runProjection(any());
        assertThat(outcome.state().lastFailureReason()).contains("accepted=20990");
    }

    @Test
    void projectionFailureAfterPublishingIsReportedSeparately() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.of(21000L));
        when(source.acquire(eq(Dataset.SALES_COMMERCIAL), eq(Q20262), anyString())).thenReturn(acquisition(Map.of(Q20262, 21000L), 22));
        when(executions.runFacts(any())).thenReturn(ImportExecution.completed(0));
        when(executions.runProjection(any())).thenReturn(ImportExecution.failed("FAILED", "boom"));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.PUBLISHED_NOT_PROJECTED);
        assertThat(outcome.state().consecutiveFailures()).isEqualTo(1);
    }

    @Test
    void ignoredDatasetPublishesOnlyUpToTheQuarterLimitInAscendingOrder() {
        published(Dataset.POPULATION_COMMERCIAL, slot(Q20261, 1650));
        when(source.probe(Dataset.POPULATION_COMMERCIAL, Q20262)).thenReturn(Optional.of(4950L));
        when(source.acquire(eq(Dataset.POPULATION_COMMERCIAL), eq(Q20262), anyString()))
            .thenReturn(acquisition(Map.of(Q20261, 1650L, Q20262, 1650L, Q20263, 1650L), 5));
        jobsSucceed();

        DatasetRefreshOutcome oneAtATime = processor(true, 1).refresh(Dataset.POPULATION_COMMERCIAL,
            DatasetRefreshState.initial(Dataset.POPULATION_COMMERCIAL), 600, FIRED);
        assertThat(oneAtATime.slots()).extracting(DatasetRefreshSlot::period).containsExactly(Q20262);

        DatasetRefreshOutcome two = processor(true, 2).refresh(Dataset.POPULATION_COMMERCIAL,
            DatasetRefreshState.initial(Dataset.POPULATION_COMMERCIAL), 600, FIRED);
        assertThat(two.slots()).extracting(DatasetRefreshSlot::period).containsExactly(Q20262, Q20263);
        assertThat(two.slots()).extracting(DatasetRefreshSlot::result).containsOnly(DatasetRefreshResult.PUBLISHED);
    }

    @Test
    void publishedSlotWithMismatchedTypedRowsIsProjectedFirst() {
        when(releases.publishedSlots(Dataset.SALES_COMMERCIAL, SPATIAL, "seoul-v1")).thenReturn(List.of(slot(Q20261, 20000)));
        when(projections.typedRowCounts(Dataset.SALES_COMMERCIAL, SPATIAL)).thenReturn(Map.of());
        when(executions.runProjection(any())).thenReturn(ImportExecution.completed(3));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenReturn(Optional.empty());

        DatasetRefreshOutcome outcome = processor(false).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.WOULD_PROJECT, DatasetRefreshResult.NOT_PUBLISHED_YET);
        ArgumentCaptor<ProjectionRequest> projection = ArgumentCaptor.forClass(ProjectionRequest.class);
        verify(executions).runProjection(projection.capture());
        assertThat(projection.getValue().dryRun()).isTrue();
        assertThat(projection.getValue().period()).isEqualTo(Q20261);
        verify(metrics).serviceTypeUnresolved(Dataset.SALES_COMMERCIAL, 3);
    }

    @Test
    void sourceErrorIsRecordedAsAFailureInsteadOfEscaping() {
        published(Dataset.SALES_COMMERCIAL, slot(Q20261, 20000));
        when(source.probe(Dataset.SALES_COMMERCIAL, Q20262)).thenThrow(new IllegalStateException("Seoul API unavailable after bounded retries"));

        DatasetRefreshOutcome outcome = processor(true).refresh(Dataset.SALES_COMMERCIAL, DatasetRefreshState.initial(Dataset.SALES_COMMERCIAL), 600, FIRED);

        assertThat(results(outcome)).containsExactly(DatasetRefreshResult.FAILED);
        assertThat(outcome.apiCalls()).isEqualTo(1);
        assertThat(outcome.state().consecutiveFailures()).isEqualTo(1);
        assertThat(outcome.state().lastFailureReason()).contains("Seoul API unavailable");
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
