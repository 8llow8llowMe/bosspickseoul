package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;

/**
 * {@code typedFactProjectionJob} 의 Job 파라미터 직렬화와 스텝 결과 키. {@link ImportJobParameters} 와 같은 역할이다.
 * 수동 CLI({@code QuarterlyImportRunner})와 자동 최신화({@code SpringBatchImportExecutionAdapter})가 이 클래스만 보고 Job 을 띄운다.
 */
public final class ProjectionJobParameters {

    /** 스텝 실행 컨텍스트 키. 자동 최신화가 Job 을 띄운 뒤 이 값으로 업종 미해석 경고를 낸다. */
    public static final String SERVICE_TYPE_UNRESOLVED_ROWS = "serviceTypeUnresolvedRows";

    private ProjectionJobParameters() {
    }

    /** runId 만 식별 파라미터다. 같은 runId 재실행은 JobRepository 가 막는다. */
    public static JobParameters write(ProjectionRequest request) {
        return new JobParametersBuilder()
            .addString("runId", request.runId(), true)
            .addString("dataset", request.dataset().name(), false)
            .addString("period", request.period().value(), false)
            .addString("spatialVersion", request.spatialVersion(), false)
            .addString("schemaVersion", request.schemaVersion(), false)
            .addString("dryRun", Boolean.toString(request.dryRun()), false)
            .toJobParameters();
    }

    public static ProjectionRequest read(JobParameters parameters) {
        return new ProjectionRequest(
            parameters.getString("runId"),
            Dataset.parse(parameters.getString("dataset")),
            new Quarter(parameters.getString("period")),
            parameters.getString("spatialVersion"),
            parameters.getString("schemaVersion"),
            ImportJobParameters.strictBoolean(parameters.getString("dryRun")));
    }
}
