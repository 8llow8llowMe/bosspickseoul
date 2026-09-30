package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.quartz.QuartzJobBean;

@DisallowConcurrentExecution
public class DatasetStagingPurgeQuartzJob extends QuartzJobBean {

    private final JobLauncher jobLauncher;
    private final Job datasetStagingPurgeJob;

    public DatasetStagingPurgeQuartzJob(JobLauncher jobLauncher, @Qualifier("datasetStagingPurgeJob") Job datasetStagingPurgeJob) {
        this.jobLauncher = jobLauncher;
        this.datasetStagingPurgeJob = datasetStagingPurgeJob;
    }

    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        try {
            JobExecution execution = jobLauncher.run(datasetStagingPurgeJob,
                new JobParametersBuilder().addLong("firedAt", context.getFireTime().getTime()).toJobParameters());
            if (execution.getStatus() != BatchStatus.COMPLETED) {
                throw new JobExecutionException("datasetStagingPurgeJob ended " + execution.getStatus());
            }
        } catch (JobExecutionException e) {
            throw e;
        } catch (Exception e) {
            throw new JobExecutionException(e);
        }
    }
}
