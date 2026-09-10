package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.batch.job;

import com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.batch.tasklet.PolicyCollectTasklet;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.interceptor.DefaultTransactionAttribute;

@Configuration
public class PolicyCollectJobConfig {

    public static final String JOB_NAME = "policyCollectJob";
    private static final String STEP_NAME = "policyCollectStep";

    @Bean
    public Job policyCollectJob(JobRepository jobRepository, Step policyCollectStep) {
        return new JobBuilder(JOB_NAME, jobRepository)
            .start(policyCollectStep)
            .build();
    }

    @Bean
    public Step policyCollectStep(
        JobRepository jobRepository,
        PlatformTransactionManager transactionManager,
        PolicyCollectTasklet policyCollectTasklet
    ) {
        // 원천 HTTP 를 스텝 트랜잭션 밖에서 친다. persist 는 Processor.commit 의 @Transactional 이 연다.
        DefaultTransactionAttribute notSupported = new DefaultTransactionAttribute();
        notSupported.setPropagationBehavior(TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
        return new StepBuilder(STEP_NAME, jobRepository)
            .tasklet(policyCollectTasklet, transactionManager)
            .transactionAttribute(notSupported)
            .build();
    }
}
