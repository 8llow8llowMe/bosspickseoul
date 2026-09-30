package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.CommercialAnalysisImportJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.CommercialRegionImportJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.TypedFactProjectionJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import javax.sql.DataSource;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.CommercialTargetGuardRunner;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetRefreshQuartzScheduleConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.batch.SpringBatchImportExecutionAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.metrics.MicrometerDatasetRefreshMetricsAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.DatasetRefreshFacade;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshProcessor;
import org.junit.jupiter.api.DisplayName;
import org.quartz.Trigger;
import org.springframework.batch.core.launch.JobLauncher;
import org.junit.jupiter.api.Test;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.scope.StepScope;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * 분기 적재 빈이 quarterly 프로파일 없이(상시 컨테이너) 조립되는지 본다. 서비스에 컨텍스트 로딩 테스트가 없어서
 * 프로파일을 걷어낸 뒤의 빈 충돌·주입 모호성은 단위 테스트로 잡히지 않는다.
 *
 * <p>실제 DB 는 붙이지 않는다. 기본 DataSource 와 JobRepository 는 모의 객체이고, commercial 풀은 만들기만 하고 연결하지 않는다.
 */
class AlwaysOnDatasetImportWiringTest {

    private static final String DISTRICT = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev";
    private static final String COMMERCIAL = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev";

    private final DataSource primary = mock(DataSource.class);

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withBean(DataSource.class, () -> primary)
        .withBean(JobRepository.class, () -> mock(JobRepository.class))
        .withBean(StepScope.class)
        .withUserConfiguration(CommercialDataSourceConfig.class, QuarterlyImportConfig.class,
            CommercialAnalysisImportJobConfig.class, CommercialRegionImportJobConfig.class, TypedFactProjectionJobConfig.class)
        .withPropertyValues(
            "spring.datasource.url=" + DISTRICT,
            "batch.commercial.datasource.url=" + COMMERCIAL);

    @Test
    @DisplayName("자동 최신화가 켜진 상시 컨텍스트에서 분기 적재 Job 과 포트가 commercial 풀로 조립된다")
    void assemblesImportJobsOnTheCommercialPool() {
        runner.withPropertyValues("batch.dataset-refresh.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBeansOfType(Job.class)).containsKeys(
                "commercialAnalysisImportJob", "commercialRegionImportJob", "typedFactProjectionJob");
            assertThat(context).hasSingleBean(DatasetSourcePort.class).hasSingleBean(TypedFactProjectionPort.class);

            JdbcTemplate commercial = context.getBean("commercialJdbcTemplate", JdbcTemplate.class);
            assertThat(commercial.getDataSource()).isNotSameAs(primary);
            Object releaseJdbc = ReflectionTestUtils.getField(context.getBean(DatasetReleasePort.class), "jdbc");
            assertThat(releaseJdbc).isSameAs(commercial);
        });
    }

    @Test
    @DisplayName("자동 최신화가 켜지면 유스케이스·Job 실행 어댑터·트리거까지 한 컨텍스트에서 조립된다")
    void assemblesTheRefreshSchedulerWhenEnabled() {
        refreshRunner().withPropertyValues("batch.dataset-refresh.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(DatasetRefreshUseCase.class).hasSingleBean(CommercialTargetGuardRunner.class);
            assertThat(context.getBean("datasetRefreshTrigger", Trigger.class).getKey().getName()).isEqualTo("datasetRefreshTrigger");
        });
    }

    @Test
    @DisplayName("자동 최신화가 꺼져 있으면 트리거를 등록하지 않는다")
    void registersNoTriggerWhenRefreshIsDisabled() {
        refreshRunner().run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).doesNotHaveBean(Trigger.class);
        });
    }

    private ApplicationContextRunner refreshRunner() {
        return runner
            .withBean(JobLauncher.class, () -> mock(JobLauncher.class))
            .withUserConfiguration(DatasetRefreshPropertiesConfig.class, PolicyIngestionPropertiesConfig.class,
                DatasetRefreshQuartzScheduleConfig.class, DatasetRefreshFacade.class, DatasetRefreshProcessor.class,
                SpringBatchImportExecutionAdapter.class, MicrometerDatasetRefreshMetricsAdapter.class, CommercialTargetGuardRunner.class)
            .withPropertyValues("batch.policy.stale-ratio=0.5", "batch.policy.purge-grace-days=30");
    }

    @Test
    @DisplayName("ObjectMapper 빈을 등록하지 않아 Boot 기본 ObjectMapper 를 밀어내지 않는다")
    void doesNotRegisterAnObjectMapperBean() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).doesNotHaveBean(ObjectMapper.class);
        });
    }

    @Test
    @DisplayName("commercial Job 이 모두 꺼져 있으면 기본 DataSource 로 조립된다(quarterly CLI 와 같은 경로)")
    void fallsBackToThePrimaryDataSourceWhenCommercialJobsAreOff() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean("commercialJdbcTemplate", JdbcTemplate.class).getDataSource()).isSameAs(primary);
        });
    }
}
