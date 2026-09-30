package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.scheduling.quartz.QuartzJobBean;

/**
 * 매일 05:00(KST) 자동 최신화. 클러스터 Quartz 라 인스턴스가 여럿이어도 한 곳에서만 돈다.
 * 데이터셋 단위 실패는 유스케이스가 결과로 흡수한다. 여기까지 올라온 예외만 Quartz 실패로 남긴다.
 */
@DisallowConcurrentExecution
public class DatasetRefreshQuartzJob extends QuartzJobBean {

    private final DatasetRefreshUseCase datasetRefreshUseCase;

    public DatasetRefreshQuartzJob(DatasetRefreshUseCase datasetRefreshUseCase) {
        this.datasetRefreshUseCase = datasetRefreshUseCase;
    }

    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        try {
            datasetRefreshUseCase.refresh(context.getFireTime().toInstant());
        } catch (RuntimeException exception) {
            throw new JobExecutionException(exception);
        }
    }
}
