package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.properties.DatasetStagingPurgeProperties;
import java.util.TimeZone;
import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** {@code BATCH_STAGING_PURGE_ENABLED=true} 일 때만 주간(기본 일요일 04:00 KST) 트리거를 등록한다. */
@Configuration
@ConditionalOnProperty(prefix = "batch.staging-purge", name = "enabled", havingValue = "true")
public class DatasetStagingPurgeQuartzScheduleConfig {

    @Bean
    public JobDetail datasetStagingPurgeJobDetail() {
        return JobBuilder.newJob(DatasetStagingPurgeQuartzJob.class)
            .withIdentity("datasetStagingPurgeQuartzJob")
            .storeDurably()
            .requestRecovery()
            .build();
    }

    @Bean
    public Trigger datasetStagingPurgeTrigger(JobDetail datasetStagingPurgeJobDetail, DatasetStagingPurgeProperties properties) {
        return TriggerBuilder.newTrigger()
            .forJob(datasetStagingPurgeJobDetail)
            .withIdentity("datasetStagingPurgeTrigger")
            .withSchedule(CronScheduleBuilder.cronSchedule(properties.cron())
                .inTimeZone(TimeZone.getTimeZone("Asia/Seoul"))
                .withMisfireHandlingInstructionDoNothing())
            .build();
    }
}
