package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.time.Instant;

/**
 * 데이터셋 1종의 자동 최신화 상태({@code dataset_refresh_state} 한 행). 게시 여부의 정본은 dataset_release 이고,
 * 이 행은 "원천을 또 받을지"를 싸게 판단하는 데만 쓴다. 지워도 다음 run 이 한 번 더 받을 뿐 게시가 깨지지 않는다.
 *
 * @param lastSourceTotal     마지막 탐지의 {@code list_total_count}. 분기 인자를 무시하는 데이터셋은 이 값이 그대로면 새 분기가 없다
 * @param newestSourcePeriod  마지막 수집에서 본 가장 늦은 분기
 * @param consecutiveFailures 연속 실패 횟수. 0 이 아니면 쿨다운 동안 이 데이터셋을 건너뛴다
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
    int consecutiveFailures
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
        return new DatasetRefreshState(dataset, null, null, null, null, null, null, null, 0);
    }

    public DatasetRefreshState probed(Instant at, long sourceTotal) {
        return new DatasetRefreshState(dataset, at, sourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures);
    }

    /** 원천에 그 분기 행이 없었다. 탐지 시각만 남기고 합계는 건드리지 않는다. */
    public DatasetRefreshState probedWithoutRows(Instant at) {
        return new DatasetRefreshState(dataset, at, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures);
    }

    public DatasetRefreshState fetched(String runId, String rawLocation, Quarter newestPeriod) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestPeriod, runId, rawLocation,
            lastFailureAt, lastFailureReason, consecutiveFailures);
    }

    public DatasetRefreshState failed(Instant at, String reason) {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            at, reason, consecutiveFailures + 1);
    }

    /** 실패 기록은 남기고 연속 실패만 끊는다. 마지막 원인은 운영자가 나중에 읽을 수 있어야 한다. */
    public DatasetRefreshState succeeded() {
        return new DatasetRefreshState(dataset, lastProbeAt, lastSourceTotal, newestSourcePeriod, lastFetchRunId, lastFetchRawLocation,
            lastFailureAt, lastFailureReason, 0);
    }
}
