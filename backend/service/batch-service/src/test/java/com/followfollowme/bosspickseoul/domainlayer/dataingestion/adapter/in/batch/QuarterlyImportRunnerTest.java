package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

@ExtendWith(MockitoExtension.class)
class QuarterlyImportRunnerTest {

    private static final String DEV_URL =
        "jdbc:mysql://dev-db.internal:3306/bosspickseoul_commercial_dev?serverTimezone=Asia/Seoul";

    @Mock
    private JobLauncher launcher;

    @Mock
    private Job factJob;

    @Mock
    private Job spatialJob;

    @Mock
    private Job projectJob;

    @Mock
    private Job pensionIncomeJob;

    private StandardEnvironment environment;

    @BeforeEach
    void setUp() {
        // 실제 OS 환경변수·시스템 속성이 섞이지 않게 비우고, 가드가 보는 값만 넣는다.
        environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addFirst(new MapPropertySource("guard", Map.of(
            "BATCH_DB_URL", DEV_URL,
            "spring.datasource.url", DEV_URL,
            "BATCH_ALLOWED_SCHEMAS", "bosspickseoul_commercial_dev")));
    }

    @Test
    void resolvesJobParametersFromUppercaseEnvironmentVariables() throws Exception {
        withEnv(Map.of(
            "BATCH_QUARTERLY_JOB", "project",
            "BATCH_QUARTERLY_RUN_ID", "project-consumption-20234-001",
            "BATCH_QUARTERLY_DATASET", "CONSUMPTION_ADMINISTRATION",
            "BATCH_QUARTERLY_PERIOD", "20234",
            "BATCH_QUARTERLY_SPATIAL_VERSION", "legacy-20233",
            "BATCH_QUARTERLY_DRY_RUN", "false"));

        JobParameters parameters = runProject();

        assertThat(parameters.getString("runId")).isEqualTo("project-consumption-20234-001");
        assertThat(parameters.getString("dataset")).isEqualTo("CONSUMPTION_ADMINISTRATION");
        assertThat(parameters.getString("period")).isEqualTo("20234");
        assertThat(parameters.getString("spatialVersion")).isEqualTo("legacy-20233");
        assertThat(parameters.getString("schemaVersion")).isEqualTo("seoul-v1");
        assertThat(parameters.getString("dryRun")).isEqualTo("false");
    }

    @Test
    void commandLineOptionWinsOverEnvironmentVariable() throws Exception {
        withEnv(Map.of(
            "BATCH_QUARTERLY_RUN_ID", "from-env",
            "BATCH_QUARTERLY_DRY_RUN", "false",
            "BATCH_QUARTERLY_DATASET", "CONSUMPTION_ADMINISTRATION",
            "BATCH_QUARTERLY_PERIOD", "20234",
            "BATCH_QUARTERLY_SPATIAL_VERSION", "legacy-20233"));

        JobParameters parameters = runProject("--job=project", "--run-id=from-cli", "--dry-run=true");

        assertThat(parameters.getString("runId")).isEqualTo("from-cli");
        assertThat(parameters.getString("dryRun")).isEqualTo("true");
        assertThat(parameters.getString("dataset")).isEqualTo("CONSUMPTION_ADMINISTRATION");
    }

    @Test
    void blankEnvironmentValueFallsBackToDefault() throws Exception {
        withEnv(Map.of(
            "BATCH_QUARTERLY_JOB", "project",
            "BATCH_QUARTERLY_RUN_ID", "project-consumption-20234-002",
            "BATCH_QUARTERLY_DATASET", "CONSUMPTION_ADMINISTRATION",
            "BATCH_QUARTERLY_PERIOD", "20234",
            "BATCH_QUARTERLY_SPATIAL_VERSION", "legacy-20233",
            "BATCH_QUARTERLY_DRY_RUN", " ",
            "BATCH_QUARTERLY_SCHEMA_VERSION", ""));

        JobParameters parameters = runProject();

        // compose 가 `-e BATCH_QUARTERLY_DRY_RUN=` 처럼 빈 값을 넘겨도 실게시로 새지 않는다.
        assertThat(parameters.getString("dryRun")).isEqualTo("true");
        assertThat(parameters.getString("schemaVersion")).isEqualTo("seoul-v1");
    }

    @Test
    void blankRequiredEnvironmentValueIsStillRequired() {
        withEnv(Map.of("BATCH_QUARTERLY_JOB", "project", "BATCH_QUARTERLY_RUN_ID", "  "));

        assertThatThrownBy(() -> runner().run(new DefaultApplicationArguments()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Required option: run-id");
        verifyNoInteractions(launcher);
    }

    @Test
    void rejectsRepeatedCommandLineOptionEvenWhenEnvironmentIsSet() {
        withEnv(Map.of("BATCH_QUARTERLY_RUN_ID", "from-env"));

        assertThatThrownBy(() -> runner().run(new DefaultApplicationArguments("--run-id=a", "--run-id=b")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Option must occur once: run-id");
        verifyNoInteractions(launcher);
    }

    /** 국민연금 자치구 평균소득(이슈 #415). 운영 명령 그대로 넘기면 파일·문자셋·서울 행 수가 Job 파라미터로 간다. dry-run 이 기본이다. */
    @Test
    void pensionIncomeJobCarriesTheFileCharsetAndSeoulRowCountAndDefaultsToDryRun() throws Exception {
        JobParameters parameters = run(pensionIncomeJob, "--job=pension-income", "--run-id=pension-income-20241231-001",
            "--source-file=/app/data/input/pension.csv", "--charset=MS949", "--spatial-version=legacy-20233",
            "--expected-rows=125", "--source-updated-at=2025-01-31T00:00:00Z");

        assertThat(parameters.getString("runId")).isEqualTo("pension-income-20241231-001");
        assertThat(parameters.getString("sourceFile")).isEqualTo(Path.of("/app/data/input/pension.csv").toString());
        assertThat(parameters.getString("charset")).isEqualTo("MS949");
        assertThat(parameters.getString("spatialVersion")).isEqualTo("legacy-20233");
        assertThat(parameters.getLong("expectedRows")).isEqualTo(125L);
        assertThat(parameters.getString("sourceUpdatedAt")).isEqualTo("2025-01-31T00:00:00Z");
        assertThat(parameters.getString("dryRun")).isEqualTo("true");
        // runId 만 식별 파라미터다. 같은 runId 로 실게시를 다시 띄우면 JobRepository 가 막는다.
        assertThat(parameters.getParameters()).allSatisfy((name, parameter) -> assertThat(parameter.isIdentifying()).isEqualTo("runId".equals(name)));
        assertThat(PensionIncomeJobParameters.read(parameters)).isEqualTo(new PensionIncomeImportRequest("pension-income-20241231-001",
            Path.of("/app/data/input/pension.csv"), "MS949", "legacy-20233", 125, Instant.parse("2025-01-31T00:00:00Z"), true));
    }

    @Test
    void pensionIncomeJobReadsTheOneShotContainerEnvironmentAndDefaultsTheCharsetToUtf8() throws Exception {
        withEnv(Map.of(
            "BATCH_QUARTERLY_JOB", "pension-income",
            "BATCH_QUARTERLY_RUN_ID", "pension-income-20241231-002",
            "BATCH_QUARTERLY_SOURCE_FILE", "/app/data/input/pension.csv",
            "BATCH_QUARTERLY_SPATIAL_VERSION", "legacy-20233",
            "BATCH_QUARTERLY_EXPECTED_ROWS", "125",
            "BATCH_QUARTERLY_SOURCE_UPDATED_AT", "2025-01-31T00:00:00Z",
            "BATCH_QUARTERLY_DRY_RUN", "false"));

        JobParameters parameters = run(pensionIncomeJob);

        assertThat(parameters.getString("charset")).isEqualTo("UTF-8");
        assertThat(parameters.getString("dryRun")).isEqualTo("false");
    }

    @Test
    void pensionIncomeJobRequiresTheSeoulRowCount() {
        assertThatThrownBy(() -> runner().run(new DefaultApplicationArguments("--job=pension-income", "--run-id=pension-income-001",
            "--source-file=pension.csv", "--spatial-version=legacy-20233", "--source-updated-at=2025-01-31T00:00:00Z")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Required option: expected-rows");
        verifyNoInteractions(launcher);
    }

    @Test
    void unknownJobNamesEveryJobTheRunnerAccepts() {
        assertThatThrownBy(() -> runner().run(new DefaultApplicationArguments("--job=pension", "--run-id=x")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("job must be facts, spatial, project or pension-income");
        verifyNoInteractions(launcher);
    }

    private void withEnv(Map<String, Object> variables) {
        environment.getPropertySources().addLast(
            new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, variables));
    }

    private JobParameters runProject(String... args) throws Exception {
        return run(projectJob, args);
    }

    private JobParameters run(Job job, String... args) throws Exception {
        JobExecution execution = mock(JobExecution.class);
        when(execution.getStatus()).thenReturn(BatchStatus.COMPLETED);
        when(launcher.run(eq(job), any(JobParameters.class))).thenReturn(execution);
        QuarterlyImportRunner runner = runner();

        runner.run(new DefaultApplicationArguments(args));

        ArgumentCaptor<JobParameters> captor = ArgumentCaptor.forClass(JobParameters.class);
        verify(launcher).run(eq(job), captor.capture());
        assertThat(runner.getExitCode()).isZero();
        return captor.getValue();
    }

    private QuarterlyImportRunner runner() {
        return new QuarterlyImportRunner(environment, launcher, factJob, spatialJob, projectJob, pensionIncomeJob);
    }
}
