package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.quartz.JobExecutionContext;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.launch.JobLauncher;

/**
 * JDBC JobStore 에 예전 트리거가 남아 있으면 플래그를 꺼도 발화한다. Job 은 플래그를 다시 보고 아무것도 하지 않아야 한다.
 */
class DatasetQuartzJobGuardTest {

    private static final Instant FIRED = Instant.parse("2026-09-29T20:00:00Z");

    private final JobExecutionContext context = context();

    @Test
    void disabledRefreshIgnoresAStaleTrigger() throws Exception {
        DatasetRefreshUseCase useCase = mock(DatasetRefreshUseCase.class);

        new DatasetRefreshQuartzJob(useCase, refresh(false)).executeInternal(context);

        verifyNoInteractions(useCase);
    }

    @Test
    void enabledRefreshRunsWithTheFireTime() throws Exception {
        DatasetRefreshUseCase useCase = mock(DatasetRefreshUseCase.class);

        new DatasetRefreshQuartzJob(useCase, refresh(true)).executeInternal(context);

        verify(useCase).refresh(FIRED);
    }

    @Test
    void disabledStagingPurgeNeverLaunchesTheJob() throws Exception {
        JobLauncher launcher = mock(JobLauncher.class);

        new DatasetStagingPurgeQuartzJob(launcher, mock(Job.class), purge(false)).executeInternal(context);

        verifyNoInteractions(launcher);
    }

    @Test
    void enabledStagingPurgeLaunchesTheJob() throws Exception {
        JobLauncher launcher = mock(JobLauncher.class);
        Job job = mock(Job.class);
        JobExecution execution = new JobExecution(1L);
        execution.setStatus(BatchStatus.COMPLETED);
        when(launcher.run(any(Job.class), any(JobParameters.class))).thenReturn(execution);

        new DatasetStagingPurgeQuartzJob(launcher, job, purge(true)).executeInternal(context);

        verify(launcher).run(any(Job.class), any(JobParameters.class));
    }

    private static JobExecutionContext context() {
        JobExecutionContext context = mock(JobExecutionContext.class);
        when(context.getFireTime()).thenReturn(Date.from(FIRED));
        return context;
    }

    private static DatasetRefreshProperties refresh(boolean enabled) {
        return new DatasetRefreshProperties(enabled, null, false, "legacy-20233", "seoul-v1", 600, 1, 0.2, 7, null);
    }

    private static DatasetStagingPurgeProperties purge(boolean enabled) {
        return new DatasetStagingPurgeProperties(enabled, null, 30, 7, 5000, 2);
    }
}
