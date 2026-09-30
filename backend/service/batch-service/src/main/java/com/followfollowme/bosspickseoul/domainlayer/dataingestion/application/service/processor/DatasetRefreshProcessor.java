package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

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
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 데이터셋 1종의 자동 최신화 판단과 실행. run 조립(순서·예산·상태 저장·메트릭)은 {@link DatasetRefreshRunProcessor} 가 한다. 범위는 "마지막 게시 분기 다음 ~ 원천 최신" 뿐이고, 비어 있는 과거 분기(백필)는
 * 수동 CLI({@code quarterly-import-plan.ps1})가 맡는다.
 *
 * <p>검증·게시 규칙(행 수 일치, 거부·중복·미매핑 0, 공간 READY, 더 새로운 원천 우선)은 기존 Job 안에 있다. 여기는 무엇을 언제
 * 띄울지만 정하고 같은 Job 을 수동 run 과 같은 인자로 띄운다. 원천은 한 번 받아 보관하고 dry-run·게시 모두 ARCHIVE 로 재생한다.
 *
 * <p>트랜잭션을 걸지 않는다. 원격 API 와 Job 실행이 수십 초씩 걸리므로 커넥션을 잡고 기다리지 않는다. 각 DB 쓰기는 Job 스텝과
 * 포트 어댑터가 자기 트랜잭션으로 연다.
 */
@Component
@RequiredArgsConstructor
public class DatasetRefreshProcessor {

    private static final Logger log = LoggerFactory.getLogger(DatasetRefreshProcessor.class);
    private static final long PAGE_SIZE = 1000;
    private static final DateTimeFormatter RUN_STAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmm").withZone(ZoneId.of("Asia/Seoul"));
    private static final String RUN_ID = "[a-zA-Z0-9_-]{1,64}";

    private final DatasetReleasePort releases;
    private final TypedFactProjectionPort projections;
    private final DatasetSourcePort source;
    private final DatasetImportExecutionPort executions;
    private final DatasetRefreshMetricsPort metrics;
    private final DatasetRefreshProperties properties;

    /**
     * @param remainingApiCalls 이번 run 에서 이 데이터셋이 쓸 수 있는 API 호출 수
     */
    public DatasetRefreshOutcome refresh(Dataset dataset, DatasetRefreshState state, int remainingApiCalls, Instant firedAt) {
        Run run = new Run(dataset, state, remainingApiCalls, firedAt);
        try {
            run.execute();
        } catch (RuntimeException exception) {
            // 포트 어댑터는 API 키·JDBC URL 을 예외에 싣지 않는다. 그래도 길이는 상태 컬럼에 맞춰 자른다.
            String reason = exception.getClass().getSimpleName() + ": " + exception.getMessage();
            log.warn("[dataset-refresh] dataset failed dataset={} reason={}", dataset, reason);
            run.fail(null, reason);
        }
        return new DatasetRefreshOutcome(dataset, run.slots, run.apiCalls, run.state);
    }

    /** 1회 판단의 가변 상태. 스레드 간에 공유하지 않는다. */
    private final class Run {
        private final Dataset dataset;
        private final int budget;
        private final Instant firedAt;
        private final List<DatasetRefreshSlot> slots = new ArrayList<>();
        private DatasetRefreshState state;
        private int apiCalls;

        Run(Dataset dataset, DatasetRefreshState state, int budget, Instant firedAt) {
            this.dataset = dataset;
            this.state = state;
            this.budget = budget;
            this.firedAt = firedAt;
        }

        void execute() {
            List<PublishedSlot> published = releases.publishedSlots(dataset, properties.spatialVersion(), properties.schemaVersion());
            reprojectMismatchedSlots(published);
            if (published.isEmpty()) {
                skip(null, DatasetRefreshResult.NO_BASELINE, "no published quarter; backfill the first one with the manual CLI");
                return;
            }
            Quarter latest = published.getLast().period();
            Quarter candidate = latest.next();
            Optional<Quarter> lastPublishable = dataset.lastPublishableQuarter();
            if (lastPublishable.isPresent() && candidate.compareTo(lastPublishable.get()) > 0) {
                skip(candidate, DatasetRefreshResult.DISCONTINUED, "source discontinued after " + lastPublishable.get().value());
                return;
            }
            if (inCooldown()) {
                skip(candidate, DatasetRefreshResult.COOLDOWN, "consecutiveFailures=" + state.consecutiveFailures());
                return;
            }
            if (budget - apiCalls < 1) {
                skip(candidate, DatasetRefreshResult.BUDGET, "no API calls left for probe");
                return;
            }
            apiCalls++;
            Optional<Long> probed = source.probe(dataset, candidate);
            if (probed.isEmpty()) {
                state = state.probedWithoutRows(firedAt);
                skip(candidate, DatasetRefreshResult.NOT_PUBLISHED_YET, "source has no rows for " + candidate.value());
                return;
            }
            long total = probed.get();
            if (unchanged(total, latest, candidate)) {
                state = state.probed(firedAt, total);
                skip(candidate, DatasetRefreshResult.UNCHANGED, "sourceTotal=" + total);
                return;
            }
            long pages = (total + PAGE_SIZE - 1) / PAGE_SIZE;
            if (pages > budget - apiCalls) {
                skip(candidate, DatasetRefreshResult.BUDGET, "needs " + pages + " calls, " + (budget - apiCalls) + " left");
                return;
            }
            String fetchRunId = runId("", candidate, "-fetch");
            // 수집이 중간에 실패해도 예산을 넉넉히 잡아 둔다. 성공하면 실제 호출 수로 바로잡는다.
            apiCalls += (int) pages;
            SourceAcquisition acquisition = source.acquire(dataset, candidate, fetchRunId);
            apiCalls += acquisition.apiCalls() - (int) pages;
            List<Quarter> quarters = acquisition.rowsByQuarter().keySet().stream()
                .filter(quarter -> quarter.compareTo(latest) > 0)
                .filter(quarter -> lastPublishable.isEmpty() || quarter.compareTo(lastPublishable.get()) <= 0)
                .limit(properties.maxQuartersPerRun())
                .toList();
            Quarter newest = acquisition.rowsByQuarter().isEmpty() ? state.newestSourcePeriod() : acquisition.rowsByQuarter().lastKey();
            if (quarters.isEmpty()) {
                state = state.probed(firedAt, total).fetched(fetchRunId, acquisition.rawLocation(), newest);
                skip(candidate, DatasetRefreshResult.NOT_PUBLISHED_YET, "source newest=" + (newest == null ? "none" : newest.value()));
                return;
            }
            boolean allSucceeded = publishQuarters(published, quarters, acquisition);
            if (allSucceeded) {
                // 원천 합계는 성공했을 때만 기억한다. 실패한 합계를 기억하면 쿨다운 뒤에도 UNCHANGED 로 영영 건너뛴다.
                state = state.probed(firedAt, total).fetched(fetchRunId, acquisition.rawLocation(), newest).succeeded();
            }
        }

        /**
         * 원천 합계가 지난번과 같으면 받지 않는다.
         *
         * <p>분기 인자를 무시하는 데이터셋은 합계가 전 기간이므로 같으면 새 분기가 없다. 다만 publish=true 인데 지난번에 본 최신 분기가
         * 아직 게시되지 않았으면(분기 상한·게시 전환 직후) 다시 받는다. 분기 인자를 존중하는 데이터셋은 합계가 분기별이라 다른 분기끼리
         * 비교하면 안 된다(CHANGE_COMMERCIAL 은 늘 1650). 같은 후보 분기를 publish=false 로 이미 평가한 경우만 건너뛴다.
         */
        private boolean unchanged(long total, Quarter latest, Quarter candidate) {
            Long lastTotal = state.lastSourceTotal();
            Quarter newest = state.newestSourcePeriod();
            if (lastTotal == null || lastTotal != total || newest == null) {
                return false;
            }
            if (dataset.quarterArgumentHonoured()) {
                return !properties.publish() && newest.equals(candidate);
            }
            return !properties.publish() || newest.compareTo(latest) <= 0;
        }

        private boolean inCooldown() {
            return state.consecutiveFailures() > 0 && state.lastFailureAt() != null
                && state.lastFailureAt().plus(Duration.ofDays(properties.failureCooldownDays())).isAfter(firedAt);
        }

        /**
         * 이미 게시됐는데 typed 행 수가 게시 건수와 다른 슬롯을 먼저 이관한다({@code quarterly-import-coverage.sql} 5절 판정).
         * 이관 실패로 화면에 안 나오는 분기를 새 분기보다 먼저 복구한다. 메모리 때문에 run 당 분기 상한을 같이 적용한다.
         */
        private void reprojectMismatchedSlots(List<PublishedSlot> published) {
            if (published.isEmpty()) {
                return;
            }
            Map<Quarter, Long> typed = projections.typedRowCounts(dataset, properties.spatialVersion());
            Optional<Quarter> lastPublishable = dataset.lastPublishableQuarter();
            List<PublishedSlot> mismatched = published.stream()
                .filter(slot -> lastPublishable.isEmpty() || slot.period().compareTo(lastPublishable.get()) <= 0)
                .filter(slot -> typed.getOrDefault(slot.period(), 0L) != slot.acceptedCount())
                .limit(properties.maxQuartersPerRun())
                .toList();
            for (PublishedSlot slot : mismatched) {
                boolean dryRun = !properties.publish();
                ImportExecution execution = executions.runProjection(new ProjectionRequest(projectRunId(slot.period()), dataset,
                    slot.period(), properties.spatialVersion(), properties.schemaVersion(), dryRun));
                if (!execution.completed()) {
                    fail(slot.period(), "projection " + execution.status() + ": " + execution.failure());
                    return;
                }
                warnUnresolvedServiceTypes(slot.period(), execution);
                record(slot.period(), dryRun ? DatasetRefreshResult.WOULD_PROJECT : DatasetRefreshResult.PROJECTED,
                    "typed=" + typed.getOrDefault(slot.period(), 0L) + " accepted=" + slot.acceptedCount());
            }
        }

        /** @return 모든 분기가 실패 없이 끝났으면 true */
        private boolean publishQuarters(List<PublishedSlot> published, List<Quarter> quarters, SourceAcquisition acquisition) {
            Map<Quarter, Long> baselines = new HashMap<>();
            published.forEach(slot -> baselines.put(slot.period(), slot.acceptedCount()));
            long latestAccepted = published.getLast().acceptedCount();
            Path raw = Path.of(acquisition.rawLocation());
            for (Quarter quarter : quarters) {
                long expected = acquisition.rowsByQuarter().get(quarter);
                Optional<String> implausible = implausible(expected, baselines.getOrDefault(quarter.previous(), latestAccepted));
                if (implausible.isPresent()) {
                    record(quarter, DatasetRefreshResult.IMPLAUSIBLE, implausible.get());
                    state = state.failed(firedAt, "IMPLAUSIBLE " + quarter.value() + ": " + implausible.get());
                    return false;
                }
                ImportExecution dry = executions.runFacts(importRequest(quarter, raw, expected, true));
                if (!dry.completed()) {
                    fail(quarter, "dry-run " + dry.status() + ": " + dry.failure());
                    return false;
                }
                if (!properties.publish()) {
                    record(quarter, DatasetRefreshResult.WOULD_PUBLISH, "expected=" + expected);
                    baselines.put(quarter, expected);
                    continue;
                }
                ImportExecution publish = executions.runFacts(importRequest(quarter, raw, expected, false));
                if (!publish.completed()) {
                    fail(quarter, "publish " + publish.status() + ": " + publish.failure());
                    return false;
                }
                ImportExecution project = executions.runProjection(new ProjectionRequest(projectRunId(quarter), dataset, quarter,
                    properties.spatialVersion(), properties.schemaVersion(), false));
                if (!project.completed()) {
                    record(quarter, DatasetRefreshResult.PUBLISHED_NOT_PROJECTED, project.status() + ": " + project.failure());
                    state = state.failed(firedAt, "projection " + quarter.value() + " " + project.status() + ": " + project.failure());
                    return false;
                }
                warnUnresolvedServiceTypes(quarter, project);
                record(quarter, DatasetRefreshResult.PUBLISHED, "rows=" + expected);
                baselines.put(quarter, expected);
            }
            return true;
        }

        /** 고정 행 수가 있으면 정확히 같아야 하고, 없으면 직전 분기 대비 허용 오차 안이어야 한다. */
        private Optional<String> implausible(long expected, long baseline) {
            OptionalLong fixed = dataset.fixedRowsPerQuarter();
            if (fixed.isPresent()) {
                return expected == fixed.getAsLong() ? Optional.empty()
                    : Optional.of("expected=" + expected + " fixed=" + fixed.getAsLong());
            }
            if (baseline <= 0) {
                return Optional.of("expected=" + expected + " baseline=" + baseline);
            }
            double change = Math.abs(expected - baseline) / (double) baseline;
            return change > properties.tolerance()
                ? Optional.of("expected=" + expected + " baseline=" + baseline + " change=" + String.format(Locale.ROOT, "%.3f", change))
                : Optional.empty();
        }

        private ImportRequest importRequest(Quarter quarter, Path raw, long expected, boolean dryRun) {
            return new ImportRequest(runId("", quarter, dryRun ? "-dry" : "-pub"), dataset, quarter, properties.spatialVersion(),
                properties.schemaVersion(), ImportRequest.SourceType.ARCHIVE, raw, "UTF-8", dryRun, expected, quarter.endInstant());
        }

        private String runId(String prefix, Quarter quarter, String suffix) {
            return DatasetRefreshProcessor.runId(prefix, dataset, quarter, firedAt, suffix);
        }

        private String projectRunId(Quarter quarter) {
            return runId("project-", quarter, "");
        }

        private void warnUnresolvedServiceTypes(Quarter quarter, ImportExecution execution) {
            if (execution.serviceTypeUnresolvedRows() > 0) {
                // 게시는 계속한다(사용자 결정). 업종 Top-N 과 동종업종 피어에서 그만큼 빠진다. coverage.sql 6절로 원인을 본다.
                log.warn("[dataset-refresh] service_type unresolved dataset={} period={} rows={}",
                    dataset, quarter.value(), execution.serviceTypeUnresolvedRows());
                metrics.serviceTypeUnresolved(dataset, execution.serviceTypeUnresolvedRows());
            }
        }

        private void fail(Quarter quarter, String reason) {
            record(quarter, DatasetRefreshResult.FAILED, reason);
            state = state.failed(firedAt, reason);
        }

        private void skip(Quarter quarter, DatasetRefreshResult result, String detail) {
            record(quarter, result, detail);
        }

        private void record(Quarter quarter, DatasetRefreshResult result, String detail) {
            slots.add(new DatasetRefreshSlot(dataset, quarter, result, detail));
        }
    }

    /**
     * {@code auto-[<prefix>]<dataset>-<quarter>-<yyyyMMddHHmm KST><suffix>}. 수동 run-id({@code <dataset>-<quarter>-<attempt>})와
     * {@code auto-} 접두로 겹치지 않고, Spring Batch 식별자 규칙 {@code [a-zA-Z0-9_-]{1,64}} 를 지킨다.
     */
    static String runId(String prefix, Dataset dataset, Quarter quarter, Instant firedAt, String suffix) {
        String runId = "auto-" + prefix + dataset.name().toLowerCase(Locale.ROOT).replace('_', '-') + "-" + quarter.value()
            + "-" + RUN_STAMP.format(firedAt) + suffix;
        if (!runId.matches(RUN_ID)) {
            throw new IllegalStateException("generated runId violates the batch identifier rule: " + runId);
        }
        return runId;
    }
}
