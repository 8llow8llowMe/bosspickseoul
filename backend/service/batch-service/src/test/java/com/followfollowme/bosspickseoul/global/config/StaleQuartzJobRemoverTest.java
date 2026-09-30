package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetRefreshQuartzCleanupConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetRefreshQuartzScheduleConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetStagingPurgeQuartzCleanupConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetStagingPurgeQuartzScheduleConfig;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler.PolicyQuartzCleanupConfig;
import com.followfollowme.bosspickseoul.domainlayer.policyingestion.adapter.in.scheduler.PolicyQuartzScheduleConfig;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * 플래그를 끄고 재배포하면 기동 중(스케줄러 시작 전)에 저장된 JobDetail 을 지운다. JobKey 는 각 ScheduleConfig 의 이름과 같아야 한다.
 */
class StaleQuartzJobRemoverTest {

    private final Scheduler scheduler = mock(Scheduler.class);

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withBean(Scheduler.class, () -> scheduler)
        .withUserConfiguration(DatasetRefreshPropertiesConfig.class, PolicyIngestionPropertiesConfig.class,
            DatasetRefreshQuartzScheduleConfig.class, DatasetRefreshQuartzCleanupConfig.class,
            DatasetStagingPurgeQuartzScheduleConfig.class, DatasetStagingPurgeQuartzCleanupConfig.class,
            PolicyQuartzScheduleConfig.class, PolicyQuartzCleanupConfig.class)
        .withPropertyValues("batch.policy.stale-ratio=0.5", "batch.policy.purge-grace-days=30");

    @Test
    void everyDisabledScheduleRemovesItsStoredJobAtStartup() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).doesNotHaveBean(JobDetail.class);
            verify(scheduler).deleteJob(JobKey.jobKey("datasetRefreshQuartzJob"));
            verify(scheduler).deleteJob(JobKey.jobKey("datasetStagingPurgeQuartzJob"));
            verify(scheduler).deleteJob(JobKey.jobKey("policyCollectQuartzJob"));
            verify(scheduler).deleteJob(JobKey.jobKey("policyPurgeQuartzJob"));
        });
    }

    @Test
    void enabledScheduleKeepsItsJobAndOnlyTheOthersAreRemoved() {
        runner.withPropertyValues("batch.dataset-refresh.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean("datasetRefreshJobDetail", JobDetail.class).getKey())
                .isEqualTo(JobKey.jobKey(DatasetRefreshQuartzScheduleConfig.JOB_NAME));
            verify(scheduler, never()).deleteJob(JobKey.jobKey("datasetRefreshQuartzJob"));
            verify(scheduler).deleteJob(JobKey.jobKey("policyCollectQuartzJob"));
        });
    }

    @Test
    void cleanupJobKeysMatchTheRegisteredJobDetails() {
        runner.withPropertyValues("batch.dataset-refresh.enabled=true", "batch.staging-purge.enabled=true", "batch.policy.enabled=true")
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(context.getBeansOfType(JobDetail.class).values()).extracting(JobDetail::getKey)
                    .containsExactlyInAnyOrder(JobKey.jobKey("datasetRefreshQuartzJob"), JobKey.jobKey("datasetStagingPurgeQuartzJob"),
                        JobKey.jobKey("policyCollectQuartzJob"), JobKey.jobKey("policyPurgeQuartzJob"));
                assertThat(context).doesNotHaveBean(StaleQuartzJobRemover.class);
                verify(scheduler, never()).deleteJob(any());
            });
    }

    @Test
    void aFailedRemovalDoesNotStopStartup() throws Exception {
        when(scheduler.deleteJob(any())).thenThrow(new SchedulerException("QRTZ_LOCKS missing"));

        runner.run(context -> assertThat(context).hasNotFailed());
    }

    /** LocalDataSourceJobStore 는 호출자 트랜잭션에 참여한다. 트랜잭션 없이 부르면 QRTZ_LOCKS 락이 문장 단위로 풀린다. */
    @Test
    void removalRunsInsideTheQuartzTransaction() throws Exception {
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        TransactionStatus status = new SimpleTransactionStatus();
        when(manager.getTransaction(any())).thenReturn(status);
        when(scheduler.deleteJob(any())).thenReturn(true);

        new StaleQuartzJobRemover(provider(scheduler), provider(manager), "dataset-refresh", List.of("datasetRefreshQuartzJob"))
            .afterSingletonsInstantiated();

        InOrder order = inOrder(manager, scheduler);
        order.verify(manager).getTransaction(any());
        order.verify(scheduler).deleteJob(JobKey.jobKey("datasetRefreshQuartzJob"));
        order.verify(manager).commit(status);
    }

    @SuppressWarnings("unchecked")
    private static <T> ObjectProvider<T> provider(T value) {
        ObjectProvider<T> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(value);
        return provider;
    }

    @Test
    void doesNothingWithoutAScheduler() {
        @SuppressWarnings("unchecked")
        ObjectProvider<Scheduler> none = mock(ObjectProvider.class);

        @SuppressWarnings("unchecked")
        ObjectProvider<PlatformTransactionManager> noManager = mock(ObjectProvider.class);

        new StaleQuartzJobRemover(none, noManager, "dataset-refresh", List.of("datasetRefreshQuartzJob")).afterSingletonsInstantiated();

        verify(none).getIfAvailable();
    }
}
