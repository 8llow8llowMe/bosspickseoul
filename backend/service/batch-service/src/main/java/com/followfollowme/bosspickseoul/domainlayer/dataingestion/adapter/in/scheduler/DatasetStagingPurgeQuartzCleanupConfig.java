package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.config.StaleQuartzJobRemover;
import java.util.List;
import org.quartz.Scheduler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 스테이징 정리가 꺼져 있으면 예전에 저장된 {@code datasetStagingPurgeQuartzJob} 과 트리거를 기동 시 지운다. */
@Configuration
@ConditionalOnProperty(prefix = "batch.staging-purge", name = "enabled", havingValue = "false", matchIfMissing = true)
public class DatasetStagingPurgeQuartzCleanupConfig {

    @Bean
    public StaleQuartzJobRemover datasetStagingPurgeStaleQuartzJobRemover(ObjectProvider<Scheduler> scheduler) {
        return new StaleQuartzJobRemover(scheduler, "staging-purge", List.of(DatasetStagingPurgeQuartzScheduleConfig.JOB_NAME));
    }
}
