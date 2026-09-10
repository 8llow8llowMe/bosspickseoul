package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.batch.job;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.batch.tasklet.PolicyPurgeTasklet;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class PolicyPurgeJobConfig {

    public static final String JOB_NAME = "policyPurgeJob";
    private static final String STEP_NAME = "policyPurgeStep";

    @Bean
    public Job policyPurgeJob(JobRepository jobRepository, Step policyPurgeStep) {
        return new JobBuilder(JOB_NAME, jobRepository)
            .start(policyPurgeStep)
            .build();
    }

    @Bean
    public Step policyPurgeStep(
        JobRepository jobRepository,
        PlatformTransactionManager transactionManager,
        PolicyPurgeTasklet policyPurgeTasklet
    ) {
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet(policyPurgeTasklet, transactionManager)
            .build();
    }
}
