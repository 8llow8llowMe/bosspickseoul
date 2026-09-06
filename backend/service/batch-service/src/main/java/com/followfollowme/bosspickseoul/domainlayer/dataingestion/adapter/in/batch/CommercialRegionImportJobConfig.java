package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.SpatialImportProcessor;
import java.nio.file.Path;
import org.springframework.batch.core.Job;
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
            var result = processor.importSnapshot(Path.of(parameters.getString("sourceFile")), parameters.getString("spatialVersion"),
                QuarterlyImportRunner.strictBoolean(parameters.getString("dryRun")));
            var execution = contribution.getStepExecution().getExecutionContext();
            execution.putString("spatialVersion", result.spatialVersion());
            execution.putString("checksum", result.checksum());
            execution.putInt("areaCount", result.areaCount());
            return RepeatStatus.FINISHED;
        }, transactionManager).build();
        return new JobBuilder("commercialRegionImportJob", repository).start(step).build();
    }
}

