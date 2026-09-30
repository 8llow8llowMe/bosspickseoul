package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.quartz.QuartzJobBean;

/**
 * 매일 05:00(KST) 자동 최신화. 클러스터 Quartz 라 인스턴스가 여럿이어도 한 곳에서만 돈다.
 * 데이터셋 단위 실패는 유스케이스가 결과로 흡수한다. 여기까지 올라온 예외만 Quartz 실패로 남긴다.
 *
 * <p>플래그가 꺼져 있으면 아무것도 하지 않는다. JDBC JobStore 에 예전 트리거가 남아 있을 수 있어서다(fail-closed).
 */
@DisallowConcurrentExecution
public class DatasetRefreshQuartzJob extends QuartzJobBean {

    private static final Logger log = LoggerFactory.getLogger(DatasetRefreshQuartzJob.class);

    private final DatasetRefreshUseCase datasetRefreshUseCase;
    private final DatasetRefreshProperties properties;

    public DatasetRefreshQuartzJob(DatasetRefreshUseCase datasetRefreshUseCase, DatasetRefreshProperties properties) {
        this.datasetRefreshUseCase = datasetRefreshUseCase;
        this.properties = properties;
    }

    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        if (!properties.enabled()) {
            log.warn("[dataset-refresh] disabled, stale trigger ignored firedAt={}", context.getFireTime());
            return;
        }
        try {
            datasetRefreshUseCase.refresh(context.getFireTime().toInstant());
        } catch (RuntimeException exception) {
            throw new JobExecutionException(exception);
        }
    }
}
