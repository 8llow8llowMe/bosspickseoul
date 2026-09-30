package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.properties.DatasetRefreshProperties;
import java.util.TimeZone;
import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * {@code BATCH_DATASET_REFRESH_ENABLED=true} 일 때만 트리거를 등록한다. misfire 는 버린다. 낮에 재기동해도 그날 05:00 을 다시
 * 돌리지 않고 다음날 05:00 을 기다린다(정책 수집과 같은 규칙).
 */
@Configuration
@ConditionalOnProperty(prefix = "batch.dataset-refresh", name = "enabled", havingValue = "true")
public class DatasetRefreshQuartzScheduleConfig {

    @Bean
    public JobDetail datasetRefreshJobDetail() {
        return JobBuilder.newJob(DatasetRefreshQuartzJob.class)
            .withIdentity("datasetRefreshQuartzJob")
            .storeDurably()
            .requestRecovery()
            .build();
    }

    @Bean
    public Trigger datasetRefreshTrigger(JobDetail datasetRefreshJobDetail, DatasetRefreshProperties properties) {
        return TriggerBuilder.newTrigger()
            .forJob(datasetRefreshJobDetail)
            .withIdentity("datasetRefreshTrigger")
            .withSchedule(CronScheduleBuilder.cronSchedule(properties.cron())
                .inTimeZone(TimeZone.getTimeZone("Asia/Seoul"))
                .withMisfireHandlingInstructionDoNothing())
            .build();
    }
}
