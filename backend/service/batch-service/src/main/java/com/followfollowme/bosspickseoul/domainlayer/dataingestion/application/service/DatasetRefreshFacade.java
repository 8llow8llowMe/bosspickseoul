package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSlot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.DatasetRefreshSummary;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshRunProcessor;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 분기 적재 자동 최신화 1회. run 조립(예산·순서·상태·메트릭)은 {@link DatasetRefreshRunProcessor} 가 하고 여기는 요약만 남긴다.
 *
 * <p>트랜잭션을 걸지 않는다. 서울 Open API 호출과 Spring Batch Job 실행이 섞인 유스케이스라 Facade 에 걸면 원격 응답과
 * Job 전체를 기다리는 동안 DB 커넥션을 잡는다. DB 구간은 Job 스텝과 포트 어댑터가 각자 연다.
 */
@Service
@RequiredArgsConstructor
public class DatasetRefreshFacade implements DatasetRefreshUseCase {

    private static final Logger log = LoggerFactory.getLogger(DatasetRefreshFacade.class);

    private final DatasetRefreshRunProcessor datasetRefreshRunProcessor;

    @Override
    public DatasetRefreshSummary refresh(Instant firedAt) {
        DatasetRefreshSummary summary = datasetRefreshRunProcessor.refreshAll(firedAt);
        for (DatasetRefreshSlot slot : summary.slots()) {
            log.info("[dataset-refresh] slot dataset={} period={} result={} detail={}", slot.dataset(),
                slot.period() == null ? "-" : slot.period().value(), slot.result(), slot.detail());
        }
        Map<DatasetRefreshResult, Long> counts = new EnumMap<>(DatasetRefreshResult.class);
        summary.slots().forEach(slot -> counts.merge(slot.result(), 1L, Long::sum));
        log.info("[dataset-refresh] run finished firedAt={} publish={} apiCalls={} results={}",
            summary.firedAt(), summary.publish(), summary.apiCalls(), counts);
        return summary;
    }
}
