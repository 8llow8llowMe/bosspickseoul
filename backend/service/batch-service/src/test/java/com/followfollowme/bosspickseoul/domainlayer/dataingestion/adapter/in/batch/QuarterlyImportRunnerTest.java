package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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

    private void withEnv(Map<String, Object> variables) {
        environment.getPropertySources().addLast(
            new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, variables));
    }

    private JobParameters runProject(String... args) throws Exception {
        JobExecution execution = mock(JobExecution.class);
        when(execution.getStatus()).thenReturn(BatchStatus.COMPLETED);
        when(launcher.run(eq(projectJob), any(JobParameters.class))).thenReturn(execution);
        QuarterlyImportRunner runner = runner();

        runner.run(new DefaultApplicationArguments(args));

        ArgumentCaptor<JobParameters> captor = ArgumentCaptor.forClass(JobParameters.class);
        verify(launcher).run(eq(projectJob), captor.capture());
        assertThat(runner.getExitCode()).isZero();
        return captor.getValue();
    }

    private QuarterlyImportRunner runner() {
        return new QuarterlyImportRunner(environment, launcher, factJob, spatialJob, projectJob);
    }
}
