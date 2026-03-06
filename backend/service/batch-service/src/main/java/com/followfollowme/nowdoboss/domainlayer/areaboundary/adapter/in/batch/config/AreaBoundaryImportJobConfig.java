package com.followfollowme.nowdoboss.domainlayer.areaboundary.adapter.in.batch.config;

import com.followfollowme.nowdoboss.domainlayer.areaboundary.application.port.in.AreaBoundaryImportUseCase;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.repeat.RepeatStatus;
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
        AreaBoundaryImportUseCase areaBoundaryImportUseCase
    ) {
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet((contribution, chunkContext) -> {
                areaBoundaryImportUseCase.importAreaBoundary();
                return RepeatStatus.FINISHED;
            }, transactionManager)
            .build();
    }
}
