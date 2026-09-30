package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.quartz.QuartzJobBean;

/** 플래그가 꺼져 있으면 저장된 트리거가 남아 발화해도 Job 을 띄우지 않는다(fail-closed). */
@DisallowConcurrentExecution
public class PolicyPurgeQuartzJob extends QuartzJobBean {

    private static final Logger log = LoggerFactory.getLogger(PolicyPurgeQuartzJob.class);

    private final JobLauncher jobLauncher;
    private final Job policyPurgeJob;
    private final PolicyIngestionProperties properties;

    public PolicyPurgeQuartzJob(JobLauncher jobLauncher, @Qualifier("policyPurgeJob") Job policyPurgeJob,
                                PolicyIngestionProperties properties) {
        this.jobLauncher = jobLauncher;
        this.policyPurgeJob = policyPurgeJob;
        this.properties = properties;
    }

    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        if (!properties.enabled()) {
            log.warn("[policy] disabled, stale trigger ignored job=policyPurgeJob firedAt={}", context.getFireTime());
            return;
        }
        try {
            JobExecution execution = jobLauncher.run(
                policyPurgeJob,
                new JobParametersBuilder()
                    .addLong("firedAt", context.getFireTime().getTime())
                    .toJobParameters()
            );
            if (execution.getStatus() != BatchStatus.COMPLETED) {
                throw new JobExecutionException("policyPurgeJob ended " + execution.getStatus());
            }
        } catch (JobExecutionException e) {
            throw e;
        } catch (Exception e) {
            throw new JobExecutionException(e);
        }
    }
}
