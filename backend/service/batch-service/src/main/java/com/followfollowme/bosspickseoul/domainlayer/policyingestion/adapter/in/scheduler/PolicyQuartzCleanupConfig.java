package com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.config.StaleQuartzJobRemover;
import java.util.List;
import org.quartz.Scheduler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 정책 수집이 꺼져 있으면 예전에 저장된 수집·만료 Job 과 트리거를 기동 시 지운다. */
@Configuration
@ConditionalOnProperty(prefix = "batch.policy", name = "enabled", havingValue = "false", matchIfMissing = true)
public class PolicyQuartzCleanupConfig {

    @Bean
    public StaleQuartzJobRemover policyStaleQuartzJobRemover(ObjectProvider<Scheduler> scheduler) {
        return new StaleQuartzJobRemover(scheduler, "policy",
            List.of(PolicyQuartzScheduleConfig.COLLECT_JOB_NAME, PolicyQuartzScheduleConfig.PURGE_JOB_NAME));
    }
}
