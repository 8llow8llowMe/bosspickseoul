package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import java.nio.file.Path;
import java.time.Instant;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;

/**
 * {@code pensionIncomeImportJob} 의 Job 파라미터 직렬화. {@link ImportJobParameters} · {@link ProjectionJobParameters} 와 같은 역할이다.
 * 수동 CLI({@code QuarterlyImportRunner} 의 {@code --job=pension-income})만 이 Job 을 띄운다. 자동 최신화 대상이 아니다.
 */
public final class PensionIncomeJobParameters {

    private PensionIncomeJobParameters() {
    }

    /** runId 만 식별 파라미터다. 같은 runId 재실행은 JobRepository 가 막으므로 dry-run 뒤 실게시는 새 runId 로 띄운다. */
    public static JobParameters write(PensionIncomeImportRequest request) {
        return new JobParametersBuilder()
            .addString("runId", request.runId(), true)
            .addString("sourceFile", request.sourceFile().toString(), false)
            .addString("charset", request.charset(), false)
            .addString("spatialVersion", request.spatialVersion(), false)
            .addLong("expectedRows", request.expectedRows(), false)
            .addString("sourceUpdatedAt", request.sourceUpdatedAt().toString(), false)
            .addString("dryRun", Boolean.toString(request.dryRun()), false)
            .toJobParameters();
    }

    public static PensionIncomeImportRequest read(JobParameters parameters) {
        return new PensionIncomeImportRequest(
            parameters.getString("runId"),
            Path.of(parameters.getString("sourceFile")),
            parameters.getString("charset"),
            parameters.getString("spatialVersion"),
            parameters.getLong("expectedRows"),
            Instant.parse(parameters.getString("sourceUpdatedAt")),
            ImportJobParameters.strictBoolean(parameters.getString("dryRun")));
    }
}
