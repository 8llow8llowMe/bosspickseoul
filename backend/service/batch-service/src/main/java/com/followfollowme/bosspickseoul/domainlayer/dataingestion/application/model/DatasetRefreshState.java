package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.time.Instant;

/**
 * 데이터셋 1종의 자동 최신화 상태({@code dataset_refresh_state} 한 행). 게시 여부의 정본은 dataset_release 이고,
 * 이 행은 "원천을 또 받을지"를 싸게 판단하는 데만 쓴다. 지워도 다음 run 이 한 번 더 받을 뿐 게시가 깨지지 않는다.
 *
 * @param lastSourceTotal           마지막으로 성공한 탐지의 {@code list_total_count}. 분기 인자를 무시하는 데이터셋은 이 값이 그대로면 새 분기가 없다
 * @param newestSourcePeriod        마지막으로 성공한 수집에서 본 가장 늦은 분기
 * @param lastFetchRunId            마지막 수집 run-id. 게시 판단이 실패(IMPLAUSIBLE·dry-run 실패)해도 남는다
 * @param lastFetchRawLocation      마지막 수집의 {@code page-<start>.json} 디렉터리. 운영자가 수동 {@code --source=ARCHIVE} 로 재생할 때 읽는다
 * @param consecutiveFailures       연속 실패 횟수. 0 이 아니면 쿨다운 동안 이 데이터셋을 건너뛴다(재이관 포함)
 * @param lastReprojectDryRunPeriod publish=false 에서 마지막으로 dry-run 재이관한 분기. 그 분기까지는 다시 dry-run 하지 않는다
 */
public record DatasetRefreshState(
    Dataset dataset,
    Instant lastProbeAt,
    Long lastSourceTotal,
    Quarter newestSourcePeriod,
    String lastFetchRunId,
    String lastFetchRawLocation,
    Instant lastFailureAt,
    String lastFailureReason,
    int consecutiveFailures,
    Quarter lastReprojectDryRunPeriod
) {

    public static final int FAILURE_REASON_MAX_LENGTH = 512;

    public DatasetRefreshState {
        if (dataset == null) {
            throw new IllegalArgumentException("dataset required");
        }
        if (consecutiveFailures < 0) {
            throw new IllegalArgumentException("consecutiveFailures must be >= 0");
        }
        if (lastFailureReason != null && lastFailureReason.length() > FAILURE_REASON_MAX_LENGTH) {
            lastFailureReason = lastFailureReason.substring(0, FAILURE_REASON_MAX_LENGTH);
        }
    }

    public static DatasetRefreshState initial(Dataset dataset) {
        return new DatasetRefreshState(dataset, null, null, null, null, null, null, null, 0, null);
    }

    public DatasetRefreshState probed(Instant at, long sourceTotal) {
        return new DatasetRefreshState(dataset, at, sourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures, lastReprojectDryRunPeriod);
    }

    /** 원천에 그 분기 행이 없었다. 탐지 시각만 남기고 합계는 건드리지 않는다. */
    public DatasetRefreshState probedWithoutRows(Instant at) {
        return new DatasetRefreshState(dataset, at, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures, lastReprojectDryRunPeriod);
    }

    /**
     * 수집한 보관본의 위치만 남긴다. 게시 판단 전에 부르므로 IMPLAUSIBLE·dry-run 실패여도 운영자가 이 경로로 수동 재생할 수 있다.
     * 최신 분기({@code newestSourcePeriod})는 성공했을 때만 {@link #fetched} 로 바꾼다. 실패한 수집으로 바꾸면 분기 인자를 존중하는
     * 데이터셋이 쿨다운 뒤 UNCHANGED 로 영영 건너뛴다.
     */
    public DatasetRefreshState fetchRecorded(String runId, String rawLocation) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, runId, rawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures, lastReprojectDryRunPeriod);
    }

    public DatasetRefreshState fetched(String runId, String rawLocation, Quarter newestPeriod) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestPeriod, runId, rawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures, lastReprojectDryRunPeriod);
    }

    public DatasetRefreshState failed(Instant at, String reason) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            at, reason, consecutiveFailures + 1, lastReprojectDryRunPeriod);
    }

    /**
     * 사실은 게시했는데 typed 이관만 실패했다(PUBLISHED_NOT_PROJECTED). 원인은 남기되 쿨다운을 걸지 않는다. 게시는 성공했으니 연속
     * 실패도 끊는다. 다음 run 의 재이관이 바로 다시 이관하고, 그 재이관까지 실패하면 그때 {@link #failed} 로 쿨다운에 들어간다.
     */
    public DatasetRefreshState projectionPending(Instant at, String reason) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            at, reason, 0, lastReprojectDryRunPeriod);
    }

    /** 실패 기록은 남기고 연속 실패만 끊는다. 마지막 원인은 운영자가 나중에 읽을 수 있어야 한다. */
    public DatasetRefreshState succeeded() {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, 0, lastReprojectDryRunPeriod);
    }

    /** publish=false 에서 이 분기를 dry-run 재이관했다. 같은 슬롯을 매일 다시 dry-run 하지 않는다. */
    public DatasetRefreshState reprojectDryRun(Quarter period) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures, period);
    }
}
