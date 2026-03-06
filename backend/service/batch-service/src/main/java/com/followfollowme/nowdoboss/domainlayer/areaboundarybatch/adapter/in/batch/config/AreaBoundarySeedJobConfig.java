package com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.adapter.in.batch.config;

import com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.application.port.in.AreaBoundarySeedUseCase;
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
public class AreaBoundarySeedJobConfig {

    public static final String JOB_NAME = "areaBoundarySeedJob";
    private static final String STEP_NAME = "areaBoundarySeedStep";

    @Bean
    public Job areaBoundarySeedJob(
        JobRepository jobRepository,
        Step areaBoundarySeedStep
    ) {
        return new JobBuilder(JOB_NAME, jobRepository)
            .start(areaBoundarySeedStep)
            .build();
    }

    @Bean
    public Step areaBoundarySeedStep(
        JobRepository jobRepository,
        PlatformTransactionManager transactionManager,
        AreaBoundarySeedUseCase areaBoundarySeedUseCase
    ) {
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet((contribution, chunkContext) -> {
                areaBoundarySeedUseCase.seedAreaBoundary();
                return RepeatStatus.FINISHED;
            }, transactionManager)
            .build();
    }
}
