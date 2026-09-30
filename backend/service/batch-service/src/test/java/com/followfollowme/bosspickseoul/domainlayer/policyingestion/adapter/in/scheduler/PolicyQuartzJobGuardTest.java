package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.quartz.JobExecutionContext;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.launch.JobLauncher;

/** 정책 수집을 끄고 재배포해도 QRTZ_* 에 남은 트리거가 발화한다. 두 Job 모두 플래그를 보고 아무것도 하지 않아야 한다. */
class PolicyQuartzJobGuardTest {

    private final JobExecutionContext context = mock(JobExecutionContext.class);
    private final JobLauncher launcher = mock(JobLauncher.class);

    PolicyQuartzJobGuardTest() {
        when(context.getFireTime()).thenReturn(Date.from(Instant.parse("2026-09-29T21:00:00Z")));
    }

    @Test
    void disabledPolicyJobsIgnoreStaleTriggers() throws Exception {
        new PolicyCollectQuartzJob(launcher, mock(Job.class), policy(false)).executeInternal(context);
        new PolicyPurgeQuartzJob(launcher, mock(Job.class), policy(false)).executeInternal(context);

        verifyNoInteractions(launcher);
    }

    @Test
    void enabledPolicyCollectLaunchesTheJob() throws Exception {
        JobExecution execution = new JobExecution(1L);
        execution.setStatus(BatchStatus.COMPLETED);
        when(launcher.run(any(Job.class), any(JobParameters.class))).thenReturn(execution);

        new PolicyCollectQuartzJob(launcher, mock(Job.class), policy(true)).executeInternal(context);

        verify(launcher).run(any(Job.class), any(JobParameters.class));
    }

    private static PolicyIngestionProperties policy(boolean enabled) {
        return new PolicyIngestionProperties(enabled, null, null, 0.5, 30, null);
    }
}
