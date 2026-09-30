package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

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
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 자동 최신화 run 1회 조립. 공간 스냅샷 확인, 상태 일괄 조회, 데이터셋 순회({@link Dataset#inRunOrder()})와 run 전체 API 예산 차감,
 * 바뀐 상태 저장, 메트릭을 맡는다. 데이터셋 1종의 판단은 {@link DatasetRefreshProcessor} 가 한다.
 *
 * <p>트랜잭션을 걸지 않는다. 서울 Open API 호출과 Spring Batch Job 실행이 섞여 있어 걸면 원격 응답과 Job 전체를 기다리는 동안 DB
 * 커넥션을 잡는다. 상태 행 upsert 는 한 문장이라 원자적이고, Job 은 스텝마다 자기 트랜잭션을 연다.
 */
@Component
@RequiredArgsConstructor
public class DatasetRefreshRunProcessor {

    private static final Logger log = LoggerFactory.getLogger(DatasetRefreshRunProcessor.class);

    private final DatasetRefreshProcessor datasets;
    private final SpatialReleasePort spatialReleases;
    private final DatasetRefreshStatePort states;
    private final DatasetRefreshMetricsPort metrics;
    private final DatasetRefreshProperties properties;
    private final Clock clock;

    public DatasetRefreshSummary refreshAll(Instant firedAt) {
        log.info("[dataset-refresh] run started firedAt={} publish={} spatialVersion={} maxApiCalls={} maxQuartersPerDataset={}",
            firedAt, properties.publish(), properties.spatialVersion(), properties.maxApiCallsPerRun(), properties.maxQuartersPerRun());
        List<DatasetRefreshSlot> slots = new ArrayList<>();
        int apiCalls = 0;
        if (!spatialReleases.isReady(properties.spatialVersion())) {
            // 공간 스냅샷이 없으면 모든 행이 unmapped 로 거부된다. 데이터셋마다 API 를 쓰기 전에 run 을 멈춘다.
            for (Dataset dataset : Dataset.inRunOrder()) {
                slots.add(new DatasetRefreshSlot(dataset, null, DatasetRefreshResult.SPATIAL_NOT_READY,
                    "spatialVersion=" + properties.spatialVersion() + " is not READY"));
            }
        } else {
            // 데이터셋마다 따로 읽지 않는다(N+1). 행이 없는 데이터셋은 초기 상태로 본다.
            Map<Dataset, DatasetRefreshState> stored = new EnumMap<>(Dataset.class);
            stored.putAll(states.findAll());
            for (Dataset dataset : Dataset.inRunOrder()) {
                DatasetRefreshState before = stored.getOrDefault(dataset, DatasetRefreshState.initial(dataset));
                DatasetRefreshOutcome outcome = datasets.refresh(dataset, before, properties.maxApiCallsPerRun() - apiCalls, firedAt);
                apiCalls += outcome.apiCalls();
                saveIfChanged(before, outcome.state());
                slots.addAll(outcome.slots());
            }
        }
        DatasetRefreshSummary summary = new DatasetRefreshSummary(firedAt, properties.publish(), apiCalls, slots);
        report(summary);
        return summary;
    }

    /**
     * 판단 없이 건너뛴 데이터셋마다 행을 갱신하지 않는다. 데이터셋 1종의 판단이 끝날 때마다 그 행만 쓴다(원천 단위가 데이터셋이라
     * 루프 안 단건 쓰기다. 다음 데이터셋이 실패해도 앞 데이터셋의 판단은 남아야 한다).
     */
    private void saveIfChanged(DatasetRefreshState before, DatasetRefreshState after) {
        if (!after.equals(before)) {
            states.save(after);
        }
    }

    private void report(DatasetRefreshSummary summary) {
        for (DatasetRefreshSlot slot : summary.slots()) {
            metrics.slot(slot.dataset(), slot.result());
        }
        metrics.apiCalls(summary.apiCalls());
        metrics.runFinished(clock.instant());
    }
}
