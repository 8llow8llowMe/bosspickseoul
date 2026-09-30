package com.followfollowme.bosspickseoul.domainlayer.areaboundary.adapter.in.batch.job;

import com.followfollowme.bosspickseoul.domainlayer.areaboundary.adapter.in.batch.tasklet.AreaBoundaryImportTasklet;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/** 영역 좌표는 기본 DataSource(district) 의 {@code area_boundary} 에 쓴다. commercial 두 번째 풀이 열려도 그쪽으로 가지 않게 이름을 적는다. */
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
        @Qualifier("districtTransactionManager") PlatformTransactionManager transactionManager,
        AreaBoundaryImportTasklet areaBoundaryImportTasklet
    ) {
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet(areaBoundaryImportTasklet, transactionManager)
            .build();
    }
}
