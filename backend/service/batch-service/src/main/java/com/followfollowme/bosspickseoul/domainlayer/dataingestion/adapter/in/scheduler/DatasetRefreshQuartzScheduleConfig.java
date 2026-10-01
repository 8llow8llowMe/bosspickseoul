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
 * 돌리지 않고 다음날 05:00 을 기다린다. 도중에 죽은 run 도 복구 재실행하지 않는다(requestRecovery 없음, Job 의 isRecovering 가드).
 */
@Configuration
@ConditionalOnProperty(prefix = "batch.dataset-refresh", name = "enabled", havingValue = "true")
public class DatasetRefreshQuartzScheduleConfig {

    /** JobDetail 이름. 꺼졌을 때 {@link DatasetRefreshQuartzCleanupConfig} 가 같은 이름으로 지운다. */
    public static final String JOB_NAME = "datasetRefreshQuartzJob";

    @Bean
    public JobDetail datasetRefreshJobDetail() {
        return JobBuilder.newJob(DatasetRefreshQuartzJob.class)
            .withIdentity(JOB_NAME)
            .storeDurably()
            // requestRecovery 를 걸지 않는다. 컨테이너가 이관 도중 OOM-kill 되면 복구 재실행이 기동 직후 같은 이관에서 다시 죽어
            // 재시작 루프와 API 쿼터 소진이 된다. 다음 05:00 을 기다린다(misfire 를 버리는 것과 같은 규칙).
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
