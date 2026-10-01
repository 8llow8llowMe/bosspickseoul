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

    /** JobDetail 이름. 꺼졌을 때 {@link DatasetStagingPurgeQuartzCleanupConfig} 가 같은 이름으로 지운다. */
    public static final String JOB_NAME = "datasetStagingPurgeQuartzJob";

    @Bean
    public JobDetail datasetStagingPurgeJobDetail() {
        return JobBuilder.newJob(DatasetStagingPurgeQuartzJob.class)
            .withIdentity(JOB_NAME)
            .storeDurably()
            // requestRecovery 를 걸지 않는다. 무거운 DELETE 를 기동 직후 다시 돌릴 이유가 없다. 다음 주를 기다린다.
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
