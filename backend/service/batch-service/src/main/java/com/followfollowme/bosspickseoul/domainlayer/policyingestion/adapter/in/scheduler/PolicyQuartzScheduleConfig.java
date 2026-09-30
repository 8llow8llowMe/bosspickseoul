package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.properties.PolicyIngestionProperties;
import java.util.TimeZone;
import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "batch.policy", name = "enabled", havingValue = "true")
public class PolicyQuartzScheduleConfig {

    /** JobDetail 이름. 꺼졌을 때 {@link PolicyQuartzCleanupConfig} 가 같은 이름으로 지운다. */
    public static final String COLLECT_JOB_NAME = "policyCollectQuartzJob";
    public static final String PURGE_JOB_NAME = "policyPurgeQuartzJob";

    @Bean
    public JobDetail policyCollectJobDetail() {
        return JobBuilder.newJob(PolicyCollectQuartzJob.class)
            .withIdentity(COLLECT_JOB_NAME)
            .storeDurably()
            .requestRecovery()
            .build();
    }

    @Bean
    public Trigger policyCollectTrigger(JobDetail policyCollectJobDetail, PolicyIngestionProperties properties) {
        return TriggerBuilder.newTrigger()
            .forJob(policyCollectJobDetail)
            .withIdentity("policyCollectTrigger")
            .withSchedule(CronScheduleBuilder.cronSchedule(properties.collectCron())
                .inTimeZone(TimeZone.getTimeZone("Asia/Seoul"))
                .withMisfireHandlingInstructionDoNothing())
            .build();
    }

    @Bean
    public JobDetail policyPurgeJobDetail() {
        return JobBuilder.newJob(PolicyPurgeQuartzJob.class)
            .withIdentity(PURGE_JOB_NAME)
            .storeDurably()
            .requestRecovery()
            .build();
    }

    @Bean
    public Trigger policyPurgeTrigger(JobDetail policyPurgeJobDetail, PolicyIngestionProperties properties) {
        return TriggerBuilder.newTrigger()
            .forJob(policyPurgeJobDetail)
            .withIdentity("policyPurgeTrigger")
            .withSchedule(CronScheduleBuilder.cronSchedule(properties.purgeCron())
                .inTimeZone(TimeZone.getTimeZone("Asia/Seoul"))
                .withMisfireHandlingInstructionDoNothing())
            .build();
    }
}
