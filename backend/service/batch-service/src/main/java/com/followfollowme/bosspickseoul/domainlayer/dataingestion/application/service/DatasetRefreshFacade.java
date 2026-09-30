package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshOutcome;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshState;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSummary;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshMetricsPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshProcessor;
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
import org.springframework.stereotype.Service;

/**
 * 분기 적재 자동 최신화 1회. 데이터셋을 적재 순서({@link Dataset#inRunOrder()})대로 돌며 run 전체 API 예산을 나눠 쓴다.
 *
 * <p>트랜잭션을 걸지 않는다. 서울 Open API 호출과 Spring Batch Job 실행이 섞인 유스케이스라 Facade 에 걸면 원격 응답과
 * Job 전체를 기다리는 동안 DB 커넥션을 잡는다. DB 구간은 Job 스텝과 포트 어댑터가 각자 연다.
 */
@Service
@RequiredArgsConstructor
public class DatasetRefreshFacade implements DatasetRefreshUseCase {

    private static final Logger log = LoggerFactory.getLogger(DatasetRefreshFacade.class);

    private final DatasetRefreshProcessor processor;
    private final DatasetRefreshMetricsPort metrics;
    private final DatasetRefreshProperties properties;
    private final Clock clock;

    @Override
    public DatasetRefreshSummary refresh(Instant firedAt) {
        log.info("[dataset-refresh] run started firedAt={} publish={} spatialVersion={} maxApiCalls={} maxQuartersPerDataset={}",
            firedAt, properties.publish(), properties.spatialVersion(), properties.maxApiCallsPerRun(), properties.maxQuartersPerRun());
        List<DatasetRefreshSlot> slots = new ArrayList<>();
        int apiCalls = 0;
        if (!processor.spatialReady()) {
            // 공간 스냅샷이 없으면 모든 행이 unmapped 로 거부된다. 데이터셋마다 API 를 쓰기 전에 run 을 멈춘다.
            for (Dataset dataset : Dataset.inRunOrder()) {
                slots.add(new DatasetRefreshSlot(dataset, null, DatasetRefreshResult.SPATIAL_NOT_READY,
                    "spatialVersion=" + properties.spatialVersion() + " is not READY"));
            }
        } else {
            Map<Dataset, DatasetRefreshState> states = new EnumMap<>(Dataset.class);
            states.putAll(processor.loadStates());
            for (Dataset dataset : Dataset.inRunOrder()) {
                DatasetRefreshState before = states.getOrDefault(dataset, DatasetRefreshState.initial(dataset));
                DatasetRefreshOutcome outcome = processor.refresh(dataset, before, properties.maxApiCallsPerRun() - apiCalls, firedAt);
                apiCalls += outcome.apiCalls();
                processor.saveIfChanged(before, outcome.state());
                slots.addAll(outcome.slots());
            }
        }
        DatasetRefreshSummary summary = new DatasetRefreshSummary(firedAt, properties.publish(), apiCalls, slots);
        report(summary);
        return summary;
    }

    private void report(DatasetRefreshSummary summary) {
        for (DatasetRefreshSlot slot : summary.slots()) {
            metrics.slot(slot.dataset(), slot.result());
            log.info("[dataset-refresh] slot dataset={} period={} result={} detail={}", slot.dataset(),
                slot.period() == null ? "-" : slot.period().value(), slot.result(), slot.detail());
        }
        metrics.apiCalls(summary.apiCalls());
        Map<DatasetRefreshResult, Long> counts = new EnumMap<>(DatasetRefreshResult.class);
        summary.slots().forEach(slot -> counts.merge(slot.result(), 1L, Long::sum));
        log.info("[dataset-refresh] run finished firedAt={} publish={} apiCalls={} results={}",
            summary.firedAt(), summary.publish(), summary.apiCalls(), counts);
        metrics.runFinished(clock.instant());
    }
}
