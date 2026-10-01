package com.followfollowme.bosspickseoul.global.config;

import java.util.List;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SchedulerMetaData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 꺼진 스케줄이 DB 에 남긴 Quartz Job 을 기동 시 지운다.
 *
 * <p>상시 컨테이너의 Quartz 는 JDBC JobStore({@code QRTZ_*}, district)다. {@code SchedulerFactoryBean} 은 Job·트리거를 추가하거나
 * 덮어쓰기만 하므로, 플래그를 끄고 재배포해도 예전에 저장된 트리거가 남아 계속 발화한다. 각 {@code *QuartzCleanupConfig} 가 플래그가
 * 꺼졌을 때 이 빈을 올려 그 기능의 JobDetail(과 딸린 트리거)을 지운다. 없으면 아무것도 하지 않는다.
 *
 * <p>{@link SmartInitializingSingleton} 이라 {@code SchedulerFactoryBean} 이 Job 을 등록한 뒤, 스케줄러가 시작하기(SmartLifecycle)
 * 전에 돈다. 지우지 못해도 기동을 막지 않는다. 막는 쪽은 각 {@code *QuartzJob} 이 실행 첫 줄에서 플래그를 다시 보는 가드다(fail-closed).
 *
 * <p>Quartz 가 쓰는 트랜잭션 매니저({@code @QuartzTransactionManager} = {@code districtTransactionManager})로 감싼다. 스프링의
 * {@code LocalDataSourceJobStore} 는 호출자 트랜잭션에 참여하므로, 트랜잭션 없이 부르면 {@code QRTZ_LOCKS ... FOR UPDATE} 가
 * 문장 단위로 바로 풀리고 트리거·Job 삭제가 따로 커밋된다.
 *
 * <p>지우는 범위는 이 인스턴스의 스케줄러 이름({@code spring.quartz.scheduler-name} = {@code QRTZ_*.SCHED_NAME})이다. 같은 이름으로 같은
 * {@code QRTZ_*} 에 붙은 다른 인스턴스의 Job 도 함께 지워지므로, 로컬({@code local,scheduler})은 상시 컨테이너와 다른 이름을 쓰고 로컬 DB 에만
 * 붙인다. 같은 이름의 다른 인스턴스가 살아 있는지는 Scheduler API 로 알 수 없어 확인하지 않는다({@code getMetaData()} 는 자기 정보뿐이다).
 * 메모리 스토어는 저장된 Job 이 없으므로 아무것도 하지 않는다(트랜잭션도 열지 않는다).
 */
public final class StaleQuartzJobRemover implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(StaleQuartzJobRemover.class);

    private final ObjectProvider<Scheduler> scheduler;
    private final ObjectProvider<PlatformTransactionManager> transactionManager;
    private final String feature;
    private final List<JobKey> jobKeys;

    /**
     * @param transactionManager {@code @QuartzTransactionManager} 로 받은 것. 없으면(테스트) 트랜잭션 없이 부른다
     * @param feature            로그 접두에 쓰는 기능 이름(예: {@code dataset-refresh})
     * @param jobNames           각 {@code *QuartzScheduleConfig} 의 JobDetail 이름. 그룹은 Quartz 기본 그룹이다
     */
    public StaleQuartzJobRemover(ObjectProvider<Scheduler> scheduler, ObjectProvider<PlatformTransactionManager> transactionManager,
                                 String feature, List<String> jobNames) {
        this.scheduler = scheduler;
        this.transactionManager = transactionManager;
        this.feature = feature;
        this.jobKeys = jobNames.stream().map(JobKey::jobKey).toList();
    }

    @Override
    public void afterSingletonsInstantiated() {
        Scheduler target = scheduler.getIfAvailable();
        if (target == null) {
            return;
        }
        SchedulerMetaData metaData = metaData(target);
        if (metaData == null || !metaData.isJobStoreSupportsPersistence()) {
            return;
        }
        PlatformTransactionManager manager = transactionManager.getIfAvailable();
        for (JobKey jobKey : jobKeys) {
            try {
                if (delete(target, manager, jobKey)) {
                    log.info("[{}] disabled, stored quartz job removed scheduler={} job={}", feature, metaData.getSchedulerName(), jobKey.getName());
                }
            } catch (SchedulerException | RuntimeException exception) {
                // QRTZ_* 가 없는 환경 등. 남은 트리거는 QuartzJob 가드가 무시한다.
                log.warn("[{}] disabled, stored quartz job not removed job={} reason={}", feature, jobKey.getName(),
                    exception.getClass().getSimpleName());
            }
        }
    }

    private SchedulerMetaData metaData(Scheduler target) {
        try {
            return target.getMetaData();
        } catch (SchedulerException exception) {
            log.warn("[{}] disabled, quartz scheduler metadata unavailable reason={}", feature, exception.getClass().getSimpleName());
            return null;
        }
    }

    private static boolean delete(Scheduler target, PlatformTransactionManager manager, JobKey jobKey) throws SchedulerException {
        if (manager == null) {
            return target.deleteJob(jobKey);
        }
        SchedulerException[] failure = new SchedulerException[1];
        Boolean deleted = new TransactionTemplate(manager).execute(status -> {
            try {
                return target.deleteJob(jobKey);
            } catch (SchedulerException exception) {
                status.setRollbackOnly();
                failure[0] = exception;
                return false;
            }
        });
        if (failure[0] != null) {
            throw failure[0];
        }
        return Boolean.TRUE.equals(deleted);
    }
}
