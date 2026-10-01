package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.areaboundary.adapter.out.persistence.AreaBoundaryJdbcAdapter;
import com.followfollowme.bosspickseoul.domainlayer.areaboundary.application.service.AreaBoundaryImportFacade;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.CommercialAnalysisImportJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.CommercialRegionImportJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.DatasetStagingPurgeJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.DatasetStagingPurgeTasklet;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.PensionIncomeImportJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.TypedFactProjectionJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetRefreshGuardRunner;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetRefreshQuartzScheduleConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.scheduler.DatasetStagingPurgeQuartzScheduleConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.batch.SpringBatchImportExecutionAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.metrics.MicrometerDatasetRefreshMetricsAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.in.DatasetRefreshUseCase;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DistrictCodeLookupPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeDistrictBulkPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.DatasetRefreshFacade;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.DatasetStagingPurgeFacade;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRefreshRunProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetStagingPurgeProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.PensionIncomeImportProcessor;
import com.followfollowme.bosspickseoul.support.IsolatedEnvironment;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.Properties;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.quartz.Trigger;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.configuration.support.DefaultBatchConfiguration;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.scope.StepScope;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration;
import org.springframework.boot.autoconfigure.quartz.QuartzAutoConfiguration;
import org.springframework.boot.autoconfigure.quartz.SchedulerFactoryBeanCustomizer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.scheduling.quartz.SchedulerFactoryBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;

/**
 * 분기 적재 빈이 quarterly 프로파일 없이(상시 컨테이너) 조립되는지, 두 번째 풀이 열렸을 때 각 쓰기가 맞는 DataSource 로 가는지 본다.
 * 서비스에 컨텍스트 로딩 테스트가 없어서 빈 충돌·주입 모호성·트랜잭션 매니저 오배정은 단위 테스트로 잡히지 않는다.
 *
 * <p>실제 DB 는 붙이지 않는다. 기본 DataSource 는 모의 객체이고, commercial 풀은 만들기만 하고 연결하지 않는다.
 */
class AlwaysOnDatasetImportWiringTest {

    private static final String DISTRICT = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_district_dev";
    private static final String COMMERCIAL = "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev";

    private final DataSource primary = mock(DataSource.class);

    private final ApplicationContextRunner runner = IsolatedEnvironment.contextRunner()
        .withBean(DataSource.class, () -> primary)
        .withBean(JobRepository.class, () -> mock(JobRepository.class))
        .withBean(StepScope.class)
        .withUserConfiguration(CommercialDataSourceConfig.class, DistrictDataSourceConfig.class, QuarterlyImportConfig.class,
            CommercialAnalysisImportJobConfig.class, CommercialRegionImportJobConfig.class, TypedFactProjectionJobConfig.class,
            PensionIncomeImportJobConfig.class, PensionIncomeImportProcessor.class)
        .withPropertyValues(
            "spring.datasource.url=" + DISTRICT,
            "batch.commercial.datasource.url=" + COMMERCIAL);

    @Test
    @DisplayName("자동 최신화가 켜진 상시 컨텍스트에서 분기 적재 Job 과 포트가 commercial 풀로 조립된다")
    void assemblesImportJobsOnTheCommercialPool() {
        runner.withPropertyValues("batch.dataset-refresh.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBeansOfType(Job.class)).containsKeys(
                "commercialAnalysisImportJob", "commercialRegionImportJob", "typedFactProjectionJob", "pensionIncomeImportJob");
            assertThat(context).hasSingleBean(DatasetSourcePort.class).hasSingleBean(TypedFactProjectionPort.class)
                .hasSingleBean(PensionIncomeSourcePort.class);

            JdbcTemplate commercial = context.getBean("commercialJdbcTemplate", JdbcTemplate.class);
            assertThat(commercial.getDataSource()).isNotSameAs(primary);
            Object releaseJdbc = ReflectionTestUtils.getField(context.getBean(DatasetReleasePort.class), "jdbc");
            assertThat(releaseJdbc).isSameAs(commercial);
            // 국민연금 자치구 평균소득(이슈 #415)도 commercial 스키마에 쓰고 그 스키마의 공간 스냅샷으로 코드를 붙인다.
            assertThat(ReflectionTestUtils.getField(context.getBean(PensionIncomeDistrictBulkPort.class), "jdbc")).isSameAs(commercial);
            assertThat(ReflectionTestUtils.getField(context.getBean(DistrictCodeLookupPort.class), "jdbc")).isSameAs(commercial);
        });
    }

    @Test
    @DisplayName("두 번째 풀이 열려도 무자격 주입은 commercial 이고, district 빈은 기본 DataSource 를 감싼다")
    void unqualifiedInjectionStaysOnCommercialWhileDistrictBeansWrapThePrimary() {
        runner.withPropertyValues("batch.dataset-refresh.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            DataSourceTransactionManager unqualified = (DataSourceTransactionManager) context.getBean(PlatformTransactionManager.class);
            assertThat(unqualified).isSameAs(context.getBean("commercialTransactionManager"));
            assertThat(unqualified.getDataSource()).isNotSameAs(primary);
            assertThat(context.getBean("districtTransactionManager", DataSourceTransactionManager.class).getDataSource()).isSameAs(primary);
            assertThat(context.getBean("districtJdbcTemplate", JdbcTemplate.class).getDataSource()).isSameAs(primary);
        });
    }

    @Test
    @DisplayName("영역 좌표는 districtJdbcTemplate / districtTransactionManager 로 기본 DataSource 에 쓴다")
    void areaBoundaryWritesGoToThePrimaryDataSource() throws Exception {
        runner.withPropertyValues("batch.dataset-refresh.enabled=true").withUserConfiguration(AreaBoundaryJdbcAdapter.class).run(context -> {
            assertThat(context).hasNotFailed();
            JdbcTemplate used = (JdbcTemplate) ReflectionTestUtils.getField(context.getBean(AreaBoundaryJdbcAdapter.class), "jdbcTemplate");
            assertThat(used).isSameAs(context.getBean("districtJdbcTemplate"));
            assertThat(used.getDataSource()).isSameAs(primary);
        });
        Transactional transactional = AnnotationUtils.findAnnotation(
            AreaBoundaryImportFacade.class.getMethod("importAreaBoundary"), Transactional.class);
        assertThat(transactional.value()).isEqualTo("districtTransactionManager");
    }

    @Test
    @DisplayName("Spring Batch JobRepository 는 기본 DataSource 의 트랜잭션 매니저를 쓴다(commercial 이 아니다)")
    void jobRepositoryUsesTheTransactionManagerOfThePrimaryDataSource() throws Exception {
        DataSource mysql = mysqlLikeDataSource();
        IsolatedEnvironment.contextRunner()
            .withBean(DataSource.class, () -> mysql)
            .withUserConfiguration(CommercialDataSourceConfig.class, DistrictDataSourceConfig.class)
            .withConfiguration(AutoConfigurations.of(BatchAutoConfiguration.class))
            .withPropertyValues("spring.datasource.url=" + DISTRICT, "batch.commercial.datasource.url=" + COMMERCIAL,
                "batch.policy.enabled=true", "spring.batch.job.enabled=false", "spring.batch.jdbc.initialize-schema=never")
            .run(context -> {
                assertThat(context).hasNotFailed();
                DefaultBatchConfiguration batch = context.getBean(DefaultBatchConfiguration.class);
                DataSourceTransactionManager used = ReflectionTestUtils.invokeMethod(batch, "getTransactionManager");
                assertThat(used).isSameAs(context.getBean("districtTransactionManager"));
                assertThat(used.getDataSource()).isSameAs(mysql);
                assertThat((DataSource) ReflectionTestUtils.invokeMethod(batch, "getDataSource")).isSameAs(mysql);
                assertThat(context.getBean("commercialTransactionManager", DataSourceTransactionManager.class).getDataSource())
                    .isNotSameAs(mysql);
            });
    }

    @Test
    @DisplayName("Quartz JDBC JobStore 는 기본 DataSource 와 그 트랜잭션 매니저를 쓴다(QRTZ_LOCKS 락이 트랜잭션에 묶인다)")
    void quartzUsesThePrimaryDataSourceAndItsTransactionManager() {
        IsolatedEnvironment.contextRunner()
            .withBean(DataSource.class, () -> primary)
            // Boot 의 SchedulerFactoryBean 은 JDBC JobStore 를 열려고 DB 에 붙는다. 대신 비어 있는 것을 두고 Boot 의 customizer 만 검사한다.
            .withBean("quartzScheduler", SchedulerFactoryBean.class, AlwaysOnDatasetImportWiringTest::idleScheduler)
            .withUserConfiguration(CommercialDataSourceConfig.class, DistrictDataSourceConfig.class)
            .withConfiguration(AutoConfigurations.of(QuartzAutoConfiguration.class))
            .withPropertyValues("spring.datasource.url=" + DISTRICT, "batch.commercial.datasource.url=" + COMMERCIAL,
                "batch.dataset-refresh.enabled=true", "spring.quartz.job-store-type=jdbc", "spring.quartz.jdbc.initialize-schema=never")
            .run(context -> {
                assertThat(context).hasNotFailed();
                SchedulerFactoryBean probe = new SchedulerFactoryBean();
                context.getBean("dataSourceCustomizer", SchedulerFactoryBeanCustomizer.class).customize(probe);
                assertThat(ReflectionTestUtils.getField(probe, "dataSource")).isSameAs(primary);
                assertThat(ReflectionTestUtils.getField(probe, "transactionManager")).isSameAs(context.getBean("districtTransactionManager"));
            });
    }

    @Test
    @DisplayName("자동 최신화가 켜지면 유스케이스·Job 실행 어댑터·가드·트리거까지 한 컨텍스트에서 조립된다")
    void assemblesTheRefreshSchedulerWhenEnabled() {
        refreshRunner().withPropertyValues("batch.dataset-refresh.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(DatasetRefreshUseCase.class)
                .hasSingleBean(CommercialDataSourceGuardRunner.class).hasSingleBean(DatasetRefreshGuardRunner.class);
            assertThat(context.getBean("datasetRefreshTrigger", Trigger.class).getKey().getName()).isEqualTo("datasetRefreshTrigger");
        });
    }

    @Test
    @DisplayName("스테이징 정리가 켜지면 주간 트리거와 정리 Job 이 조립된다")
    void assemblesTheStagingPurgeWhenEnabled() {
        refreshRunner().withPropertyValues("batch.staging-purge.enabled=true").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBeansOfType(Job.class)).containsKey("datasetStagingPurgeJob");
            assertThat(context.getBeansOfType(Trigger.class)).containsOnlyKeys("datasetStagingPurgeTrigger");
            assertThat(context.getBean("commercialJdbcTemplate", JdbcTemplate.class).getDataSource()).isNotSameAs(primary);
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

    /** 시계는 컨텍스트 중립 설정(BatchClockConfig)에서 온다. 정책 설정 없이도 자동 최신화가 조립돼야 한다. */
    private ApplicationContextRunner refreshRunner() {
        return runner
            .withBean(JobLauncher.class, () -> mock(JobLauncher.class))
            .withUserConfiguration(DatasetRefreshPropertiesConfig.class, BatchClockConfig.class,
                DatasetRefreshQuartzScheduleConfig.class, DatasetRefreshFacade.class, DatasetRefreshRunProcessor.class, DatasetRefreshProcessor.class,
                SpringBatchImportExecutionAdapter.class, MicrometerDatasetRefreshMetricsAdapter.class,
                CommercialDataSourceGuardRunner.class, DatasetRefreshGuardRunner.class,
                DatasetStagingPurgeQuartzScheduleConfig.class, DatasetStagingPurgeJobConfig.class, DatasetStagingPurgeTasklet.class,
                DatasetStagingPurgeFacade.class, DatasetStagingPurgeProcessor.class);
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
            assertThat(context.getBean("districtTransactionManager", DataSourceTransactionManager.class).getDataSource()).isSameAs(primary);
        });
    }

    /** Spring Batch 가 기동 시 DB 종류만 메타데이터로 읽는다. 쿼리는 나가지 않는다. */
    private static DataSource mysqlLikeDataSource() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metaData = mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metaData);
        when(metaData.getDatabaseProductName()).thenReturn("MySQL");
        when(metaData.getDatabaseProductVersion()).thenReturn("8.0.36");
        return dataSource;
    }

    private static SchedulerFactoryBean idleScheduler() {
        SchedulerFactoryBean scheduler = new SchedulerFactoryBean();
        scheduler.setAutoStartup(false);
        Properties properties = new Properties();
        properties.setProperty("org.quartz.threadPool.threadCount", "1");
        properties.setProperty("org.quartz.scheduler.instanceName", "wiring-test");
        scheduler.setQuartzProperties(properties);
        return scheduler;
    }
}
