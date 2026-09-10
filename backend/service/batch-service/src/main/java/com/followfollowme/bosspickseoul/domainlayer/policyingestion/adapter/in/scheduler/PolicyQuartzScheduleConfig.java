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

    @Bean
    public JobDetail policyCollectJobDetail() {
        return JobBuilder.newJob(PolicyCollectQuartzJob.class)
            .withIdentity("policyCollectQuartzJob")
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
            .withIdentity("policyPurgeQuartzJob")
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
