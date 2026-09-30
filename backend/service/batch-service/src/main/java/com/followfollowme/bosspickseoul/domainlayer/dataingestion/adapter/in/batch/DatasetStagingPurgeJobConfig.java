package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.interceptor.DefaultTransactionAttribute;

@Configuration
public class DatasetStagingPurgeJobConfig {

    public static final String JOB_NAME = "datasetStagingPurgeJob";
    private static final String STEP_NAME = "datasetStagingPurgeStep";

    @Bean
    public Job datasetStagingPurgeJob(JobRepository jobRepository, Step datasetStagingPurgeStep) {
        return new JobBuilder(JOB_NAME, jobRepository).start(datasetStagingPurgeStep).build();
    }

    @Bean
    public Step datasetStagingPurgeStep(JobRepository jobRepository,
                                        @Qualifier("commercialTransactionManager") PlatformTransactionManager transactionManager,
                                        DatasetStagingPurgeTasklet datasetStagingPurgeTasklet) {
        // 청크 DELETE 가 각자 커밋하도록 스텝 트랜잭션 밖에서 돈다. 스텝 트랜잭션으로 묶으면 청크로 나눈 의미가 없다.
        DefaultTransactionAttribute notSupported = new DefaultTransactionAttribute();
        notSupported.setPropagationBehavior(TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet(datasetStagingPurgeTasklet, transactionManager)
            .transactionAttribute(notSupported)
            .build();
    }
}
