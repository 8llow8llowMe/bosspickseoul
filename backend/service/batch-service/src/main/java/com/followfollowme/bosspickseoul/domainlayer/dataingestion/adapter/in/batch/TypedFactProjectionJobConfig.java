package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.TypedFactProjectionProcessor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class TypedFactProjectionJobConfig {

    @Bean
    public Job typedFactProjectionJob(JobRepository repository, @Qualifier("commercialTransactionManager") PlatformTransactionManager transactionManager,
                                      TypedFactProjectionProcessor processor) {
        var step = new StepBuilder("typedFactProject", repository).tasklet((contribution, context) -> {
            ProjectionRequest request = ProjectionJobParameters.read(contribution.getStepExecution().getJobParameters());
            ProjectionResult result = processor.project(request);
            var execution = contribution.getStepExecution().getExecutionContext();
            execution.putString("sourceRunId", result.sourceRunId());
            execution.putInt("projectedRows", result.rowCount());
            execution.putString("written", Boolean.toString(result.written()));
            execution.putInt(ProjectionJobParameters.SERVICE_TYPE_UNRESOLVED_ROWS, result.serviceTypeUnresolvedRows());
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        return new JobBuilder("typedFactProjectionJob", repository).start(step).build();
    }
}
