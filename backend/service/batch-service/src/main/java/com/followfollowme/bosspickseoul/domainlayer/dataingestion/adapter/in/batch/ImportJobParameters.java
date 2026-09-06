package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.nio.file.Path;
import java.time.Instant;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;

public final class ImportJobParameters {
    private ImportJobParameters() {}

    public static ImportRequest read(JobParameters p) {
        String path = p.getString("sourceFile");
        return new ImportRequest(p.getString("runId"), Dataset.parse(p.getString("dataset")), new Quarter(p.getString("period")),
            p.getString("spatialVersion"), p.getString("schemaVersion"), ImportRequest.SourceType.valueOf(p.getString("source")),
            path == null || path.isBlank() ? null : Path.of(path), p.getString("charset"), Boolean.parseBoolean(p.getString("dryRun")),
            p.getLong("expectedRows"), Instant.parse(p.getString("sourceUpdatedAt")));
    }

    public static JobParameters write(ImportRequest r) {
        // Only runId identifies an execution: concurrent launches and changed retry arguments cannot bypass the repository lock.
        return new JobParametersBuilder().addString("runId", r.runId(), true)
            .addString("dataset", r.dataset().name(), false).addString("period", r.period().value(), false)
            .addString("spatialVersion", r.spatialVersion(), false).addString("schemaVersion", r.schemaVersion(), false)
            .addString("source", r.sourceType().name(), false).addString("sourceFile", r.sourceFile() == null ? "" : r.sourceFile().toString(), false)
            .addString("charset", r.charset(), false).addString("dryRun", Boolean.toString(r.dryRun()), false)
            .addLong("expectedRows", r.expectedRows(), false).addString("sourceUpdatedAt", r.sourceUpdatedAt().toString(), false).toJobParameters();
    }
}

