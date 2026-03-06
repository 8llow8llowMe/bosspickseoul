package com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.adapter.in.batch.runner;

import com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.adapter.in.batch.config.AreaBoundarySeedJobConfig;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.batch.area-boundary-seed", name = "enabled", havingValue = "true")
public class AreaBoundarySeedJobRunner implements ApplicationRunner {

    private final JobLauncher jobLauncher;
    private final Job areaBoundarySeedJob;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        JobParameters jobParameters = new JobParametersBuilder()
            .addString("requestedAt", LocalDateTime.now().toString())
            .toJobParameters();

        log.info("영역 좌표 배치 실행 시작 - jobName: {}", AreaBoundarySeedJobConfig.JOB_NAME);
        jobLauncher.run(areaBoundarySeedJob, jobParameters);
        log.info("영역 좌표 배치 실행 종료 - jobName: {}", AreaBoundarySeedJobConfig.JOB_NAME);
    }
}
