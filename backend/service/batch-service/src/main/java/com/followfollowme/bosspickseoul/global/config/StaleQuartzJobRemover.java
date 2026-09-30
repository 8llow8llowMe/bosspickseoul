package com.followfollowme.bosspickseoul.global.config;

import java.util.List;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.SmartInitializingSingleton;

/**
 * 꺼진 스케줄이 DB 에 남긴 Quartz Job 을 기동 시 지운다.
 *
 * <p>상시 컨테이너의 Quartz 는 JDBC JobStore({@code QRTZ_*}, district)다. {@code SchedulerFactoryBean} 은 Job·트리거를 추가하거나
 * 덮어쓰기만 하므로, 플래그를 끄고 재배포해도 예전에 저장된 트리거가 남아 계속 발화한다. 각 {@code *QuartzCleanupConfig} 가 플래그가
 * 꺼졌을 때 이 빈을 올려 그 기능의 JobDetail(과 딸린 트리거)을 지운다. 없으면 아무것도 하지 않는다.
 *
 * <p>{@link SmartInitializingSingleton} 이라 {@code SchedulerFactoryBean} 이 Job 을 등록한 뒤, 스케줄러가 시작하기(SmartLifecycle)
 * 전에 돈다. 지우지 못해도 기동을 막지 않는다. 막는 쪽은 각 {@code *QuartzJob} 이 실행 첫 줄에서 플래그를 다시 보는 가드다(fail-closed).
 */
public final class StaleQuartzJobRemover implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(StaleQuartzJobRemover.class);

    private final ObjectProvider<Scheduler> scheduler;
    private final String feature;
    private final List<JobKey> jobKeys;

    /**
     * @param feature  로그 접두에 쓰는 기능 이름(예: {@code dataset-refresh})
     * @param jobNames 각 {@code *QuartzScheduleConfig} 의 JobDetail 이름. 그룹은 Quartz 기본 그룹이다
     */
    public StaleQuartzJobRemover(ObjectProvider<Scheduler> scheduler, String feature, List<String> jobNames) {
        this.scheduler = scheduler;
        this.feature = feature;
        this.jobKeys = jobNames.stream().map(JobKey::jobKey).toList();
    }

    @Override
    public void afterSingletonsInstantiated() {
        Scheduler target = scheduler.getIfAvailable();
        if (target == null) {
            return;
        }
        for (JobKey jobKey : jobKeys) {
            try {
                if (target.deleteJob(jobKey)) {
                    log.info("[{}] disabled, stored quartz job removed job={}", feature, jobKey.getName());
                }
            } catch (SchedulerException | RuntimeException exception) {
                // QRTZ_* 가 없는 환경 등. 남은 트리거는 QuartzJob 가드가 무시한다.
                log.warn("[{}] disabled, stored quartz job not removed job={} reason={}", feature, jobKey.getName(),
                    exception.getClass().getSimpleName());
            }
        }
    }
}
