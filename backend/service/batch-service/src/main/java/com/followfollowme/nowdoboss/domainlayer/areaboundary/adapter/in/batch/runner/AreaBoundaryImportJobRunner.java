package com.followfollowme.nowdoboss.domainlayer.areaboundary.adapter.in.batch.runner;

import com.followfollowme.nowdoboss.global.properties.AreaBoundaryImportProperties;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.configuration.JobRegistry;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "batch.area-boundary.import", name = "enabled", havingValue = "true")
public class AreaBoundaryImportJobRunner implements ApplicationRunner {

    private final JobLauncher jobLauncher;
    private final JobRegistry jobRegistry;
    private final AreaBoundaryImportProperties areaBoundaryImportProperties;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        JobParameters jobParameters = new JobParametersBuilder()
            .addString("requestedAt", LocalDateTime.now().toString())
            .toJobParameters();

        String jobName = areaBoundaryImportProperties.jobName();
        Job areaBoundaryImportJob = jobRegistry.getJob(jobName);

        log.info("Area boundary batch start - jobName: {}", jobName);
        jobLauncher.run(areaBoundaryImportJob, jobParameters);
        log.info("Area boundary batch end - jobName: {}", jobName);
    }
}