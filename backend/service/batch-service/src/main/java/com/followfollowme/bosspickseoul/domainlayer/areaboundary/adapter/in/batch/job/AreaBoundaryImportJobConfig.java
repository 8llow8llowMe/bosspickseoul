package com.followfollowme.bosspickseoul.domainlayer.areaboundary.adapter.in.batch.job;

import com.followfollowme.bosspickseoul.domainlayer.areaboundary.adapter.in.batch.tasklet.AreaBoundaryImportTasklet;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class AreaBoundaryImportJobConfig {

    public static final String JOB_NAME = "areaBoundaryImportJob";
    private static final String STEP_NAME = "areaBoundaryImportStep";

    @Bean
    public Job areaBoundaryImportJob(JobRepository jobRepository, Step areaBoundaryImportStep) {
        return new JobBuilder(JOB_NAME, jobRepository)
            .start(areaBoundaryImportStep)
            .build();
    }

    @Bean
    public Step areaBoundaryImportStep(
        JobRepository jobRepository,
        PlatformTransactionManager transactionManager,
        AreaBoundaryImportTasklet areaBoundaryImportTasklet
    ) {
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet(areaBoundaryImportTasklet, transactionManager)
            .build();
    }
}
