package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.nio.file.Path;
import java.time.Instant;

public record ImportRequest(String runId, Dataset dataset, Quarter period, String spatialVersion, String schemaVersion,
                            SourceType sourceType, Path sourceFile, String charset, boolean dryRun, long expectedRows, Instant sourceUpdatedAt) {
    public enum SourceType { API, CSV, ZIP }

    public ImportRequest {
        if (runId == null || !runId.matches("[a-zA-Z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid runId");
        if (dataset == null || period == null || sourceType == null) throw new IllegalArgumentException("dataset, period, source required");
        if (spatialVersion == null || !spatialVersion.matches("[a-zA-Z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid spatialVersion");
        if (!"seoul-v1".equals(schemaVersion)) throw new IllegalArgumentException("Unsupported schemaVersion; register a new source contract first");
        if (sourceType != SourceType.API && sourceFile == null) throw new IllegalArgumentException("sourceFile required");
        if (sourceType == SourceType.API && dataset.service().isBlank()) throw new IllegalArgumentException("Dataset supports archival files only");
        if (charset == null || !java.nio.charset.Charset.isSupported(charset)) throw new IllegalArgumentException("Unsupported charset");
        if (expectedRows < 1) throw new IllegalArgumentException("expectedRows must be a verified positive count for this dataset and quarter");
        if (sourceUpdatedAt == null) throw new IllegalArgumentException("sourceUpdatedAt required");
    }
}

