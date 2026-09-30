package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.ImportJobParameters;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch.TypedFactProjectionJobConfig;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportExecution;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetImportExecutionPort;
import java.util.stream.Collectors;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.StepExecution;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * 수동 CLI({@code QuarterlyImportRunner})와 같은 Job 을 같은 파라미터 직렬화로 띄운다. JobLauncher 는 동기라 Job 이 끝나야 돌아온다.
 * Job 실패와 기동 거부(같은 runId 재실행 등)를 예외가 아니라 결과로 돌려준다.
 */
@Component
public class SpringBatchImportExecutionAdapter implements DatasetImportExecutionPort {

    private static final int FAILURE_MAX_LENGTH = 400;

    private final JobLauncher launcher;
    private final Job factJob;
    private final Job projectJob;

    public SpringBatchImportExecutionAdapter(JobLauncher launcher,
                                             @Qualifier("commercialAnalysisImportJob") Job factJob,
                                             @Qualifier("typedFactProjectionJob") Job projectJob) {
        this.launcher = launcher;
        this.factJob = factJob;
        this.projectJob = projectJob;
    }

    @Override
    public ImportExecution runFacts(ImportRequest request) {
        return run(factJob, ImportJobParameters.write(request));
    }

    @Override
    public ImportExecution runProjection(ProjectionRequest request) {
        return run(projectJob, TypedFactProjectionJobConfig.write(request));
    }

    private ImportExecution run(Job job, JobParameters parameters) {
        JobExecution execution;
        try {
            execution = launcher.run(job, parameters);
        } catch (Exception exception) {
            return ImportExecution.failed("NOT_STARTED", truncate(exception.getClass().getSimpleName() + ": " + exception.getMessage()));
        }
        if (execution.getStatus() != BatchStatus.COMPLETED) {
            String failures = execution.getAllFailureExceptions().stream()
                .map(failure -> failure.getClass().getSimpleName() + ": " + failure.getMessage())
                .collect(Collectors.joining("; "));
            String reason = failures.isEmpty() ? execution.getExitStatus().getExitDescription() : failures;
            return ImportExecution.failed(execution.getStatus().name(), truncate(reason));
        }
        int unresolved = 0;
        for (StepExecution step : execution.getStepExecutions()) {
            unresolved += step.getExecutionContext().getInt(TypedFactProjectionJobConfig.SERVICE_TYPE_UNRESOLVED_ROWS, 0);
        }
        return ImportExecution.completed(unresolved);
    }

    private static String truncate(String value) {
        if (value == null) {
            return "";
        }
        return value.length() <= FAILURE_MAX_LENGTH ? value : value.substring(0, FAILURE_MAX_LENGTH);
    }
}
