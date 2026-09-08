package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSourceRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.SpatialImportProcessor;
import java.nio.file.Path;
import java.time.Instant;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@Profile("quarterly")
public class CommercialRegionImportJobConfig {
    @Bean
    public Job commercialRegionImportJob(JobRepository repository, PlatformTransactionManager transactionManager, SpatialImportProcessor processor) {
        var step = new StepBuilder("spatialSnapshotImport", repository).tasklet((contribution, context) -> {
            var parameters = contribution.getStepExecution().getJobParameters();
            var result = processor.importSnapshot(readRequest(parameters), ImportJobParameters.strictBoolean(parameters.getString("dryRun")));
            var execution = contribution.getStepExecution().getExecutionContext();
            execution.putString("spatialVersion", result.spatialVersion());
            execution.putString("checksum", result.checksum());
            execution.putInt("areaCount", result.areaCount());
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        return new JobBuilder("commercialRegionImportJob", repository).start(step).build();
    }

    static JobParameters writeRequest(String runId, SpatialSourceRequest request, boolean dryRun) {
        return new JobParametersBuilder().addString("runId", runId, true)
            .addString("source", request.kind().name(), false)
            .addString("sourceFile", request.sourceFile() == null ? "" : request.sourceFile().toString(), false)
            .addString("spatialVersion", request.spatialVersion(), false)
            .addString("sourceUpdatedAt", request.sourceUpdatedAt() == null ? "" : request.sourceUpdatedAt().toString(), false)
            .addString("dryRun", Boolean.toString(dryRun), false).toJobParameters();
    }

    static SpatialSourceRequest readRequest(JobParameters parameters) {
        String file = parameters.getString("sourceFile");
        String updatedAt = parameters.getString("sourceUpdatedAt");
        return new SpatialSourceRequest(SpatialSourceRequest.Kind.valueOf(parameters.getString("source")),
            file == null || file.isBlank() ? null : Path.of(file), parameters.getString("spatialVersion"),
            updatedAt == null || updatedAt.isBlank() ? null : Instant.parse(updatedAt));
    }
}
