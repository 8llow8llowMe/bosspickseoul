package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler;

import com.followfollowme.bosspickseoul.global.config.StaleQuartzJobRemover;
import java.util.List;
import org.quartz.Scheduler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.quartz.QuartzTransactionManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/** 자동 최신화가 꺼져 있으면 예전에 저장된 {@code datasetRefreshQuartzJob} 과 트리거를 기동 시 지운다. */
@Configuration
@ConditionalOnProperty(prefix = "batch.dataset-refresh", name = "enabled", havingValue = "false", matchIfMissing = true)
public class DatasetRefreshQuartzCleanupConfig {

    @Bean
    public StaleQuartzJobRemover datasetRefreshStaleQuartzJobRemover(ObjectProvider<Scheduler> scheduler,
                                                                     @QuartzTransactionManager ObjectProvider<PlatformTransactionManager> transactionManager) {
        return new StaleQuartzJobRemover(scheduler, transactionManager, "dataset-refresh", List.of(DatasetRefreshQuartzScheduleConfig.JOB_NAME));
    }
}
