package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.StagingPurgeResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetStagingPurgeUseCase;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetStagingPurgeProcessor;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 트랜잭션을 걸지 않는다. run 단위 청크 DELETE 하나하나가 바로 커밋돼야 락이 짧다. 한 트랜잭션으로 묶으면 수십만 행 삭제 동안
 * 분기 적재 스테이징 INSERT 가 기다린다.
 */
@Service
@RequiredArgsConstructor
public class DatasetStagingPurgeFacade implements DatasetStagingPurgeUseCase {

    private static final Logger log = LoggerFactory.getLogger(DatasetStagingPurgeFacade.class);

    private final DatasetStagingPurgeProcessor processor;

    @Override
    public StagingPurgeResult purge() {
        StagingPurgeResult result = processor.purge();
        log.info("[staging-purge] finished candidateRuns={} abandonedRuns={} skippedRuns={} unpublishedStagingRows={}"
                + " unpublishedRejectedRows={} supersededStagingRows={}", result.candidateRuns(), result.abandonedRuns(), result.skippedRuns(),
            result.unpublishedStagingRows(), result.unpublishedRejectedRows(), result.supersededStagingRows());
        return result;
    }
}
