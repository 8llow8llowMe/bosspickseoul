package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.TypedFactProjectionProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@Profile("quarterly")
public class TypedFactProjectionJobConfig {

    @Bean
    public Job typedFactProjectionJob(JobRepository repository, PlatformTransactionManager transactionManager,
                                      TypedFactProjectionProcessor processor) {
        var step = new StepBuilder("typedFactProject", repository).tasklet((contribution, context) -> {
            ProjectionRequest request = read(contribution.getStepExecution().getJobParameters());
            ProjectionResult result = processor.project(request);
            var execution = contribution.getStepExecution().getExecutionContext();
            execution.putString("sourceRunId", result.sourceRunId());
            execution.putInt("projectedRows", result.rowCount());
            execution.putString("written", Boolean.toString(result.written()));
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        return new JobBuilder("typedFactProjectionJob", repository).start(step).build();
    }

    static JobParameters write(ProjectionRequest request) {
        return new JobParametersBuilder()
            .addString("runId", request.runId(), true)
            .addString("dataset", request.dataset().name(), false)
            .addString("period", request.period().value(), false)
            .addString("spatialVersion", request.spatialVersion(), false)
            .addString("schemaVersion", request.schemaVersion(), false)
            .addString("dryRun", Boolean.toString(request.dryRun()), false)
            .toJobParameters();
    }

    static ProjectionRequest read(JobParameters parameters) {
        return new ProjectionRequest(
            parameters.getString("runId"),
            Dataset.parse(parameters.getString("dataset")),
            new Quarter(parameters.getString("period")),
            parameters.getString("spatialVersion"),
            parameters.getString("schemaVersion"),
            ImportJobParameters.strictBoolean(parameters.getString("dryRun")));
    }
}
