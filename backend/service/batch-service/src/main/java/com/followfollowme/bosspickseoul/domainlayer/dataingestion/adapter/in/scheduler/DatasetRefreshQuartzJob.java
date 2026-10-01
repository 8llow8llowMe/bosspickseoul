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
 *
 * <p>정책 수집·스테이징 정리와 달리 Spring Batch Job 으로 감싸지 않는다. 유스케이스가 분기 적재 Job 을 데이터셋마다 직접 띄우므로
 * 오케스트레이션 run 자체는 {@code BATCH_JOB_EXECUTION} 을 남기지 않는다(run 기록은 로그·메트릭·{@code dataset_refresh_state}).
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
        if (context.isRecovering()) {
            // 예전 JobDetail(requestRecovery=true)이 남아 있으면 Quartz 가 죽은 run 을 기동 직후 다시 띄운다. 다음 05:00 을 기다린다.
            log.warn("[dataset-refresh] recovering execution skipped firedAt={}", context.getFireTime());
            return;
        }
        try {
            datasetRefreshUseCase.refresh(context.getFireTime().toInstant());
        } catch (RuntimeException exception) {
            throw new JobExecutionException(exception);
        }
    }
}
