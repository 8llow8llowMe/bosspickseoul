package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.*;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import org.springframework.batch.core.*;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@Profile("quarterly")
public class QuarterlyImportRunner implements ApplicationRunner, ExitCodeGenerator {
    private final Environment environment;
    private final JobLauncher launcher;
    private final Job factJob;
    private final Job spatialJob;
    private int exitCode = 1;

    public QuarterlyImportRunner(Environment environment, JobLauncher launcher,
                                 @Qualifier("commercialAnalysisImportJob") Job factJob, @Qualifier("commercialRegionImportJob") Job spatialJob) {
        this.environment = environment;
        this.launcher = launcher;
        this.factJob = factJob;
        this.spatialJob = spatialJob;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        BatchTargetGuard.verify(environment.getProperty("BATCH_DB_URL"), environment.getProperty("spring.datasource.url"),
            environment.getProperty("BATCH_ALLOWED_SCHEMAS"));
        boolean dryRun = strictBoolean(optional(args, "dry-run", "true"));
        String runId = required(args, "run-id");
        if (!runId.matches("[a-zA-Z0-9_-]{1,64}")) throw new IllegalArgumentException("Invalid run-id");
        Job job;
        JobParameters parameters;
        if ("spatial".equals(optional(args, "job", "facts"))) {
            job = spatialJob;
            parameters = new JobParametersBuilder().addString("runId", runId, true)
                .addString("sourceFile", required(args, "source-file"), false)
                .addString("spatialVersion", required(args, "spatial-version"), false)
                .addString("dryRun", Boolean.toString(dryRun), false).toJobParameters();
        } else {
            if (!"facts".equals(optional(args, "job", "facts"))) throw new IllegalArgumentException("job must be facts or spatial");
            String file = optional(args, "source-file", "");
            ImportRequest request = new ImportRequest(runId, Dataset.parse(required(args, "dataset")), new Quarter(required(args, "period")),
                required(args, "spatial-version"), optional(args, "schema-version", "seoul-v1"),
                ImportRequest.SourceType.valueOf(required(args, "source").toUpperCase(Locale.ROOT)), file.isBlank() ? null : Path.of(file),
                optional(args, "charset", "UTF-8"), dryRun, Long.parseLong(required(args, "expected-rows")), Instant.parse(required(args, "source-updated-at")));
            job = factJob;
            parameters = ImportJobParameters.write(request);
        }
        JobExecution execution = launcher.run(job, parameters);
        exitCode = execution.getStatus() == BatchStatus.COMPLETED ? 0 : 1;
    }

    static boolean strictBoolean(String value) {
        if (!"true".equals(value) && !"false".equals(value)) throw new IllegalArgumentException("dry-run must be true or false");
        return Boolean.parseBoolean(value);
    }

    private String required(ApplicationArguments args, String name) {
        String value = optional(args, name, null);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Required option: " + name);
        return value;
    }

    private String optional(ApplicationArguments args, String name, String fallback) {
        var values = args.getOptionValues(name);
        if (values == null) return fallback;
        if (values.size() != 1) throw new IllegalArgumentException("Option must occur once: " + name);
        return values.getFirst();
    }

    @Override public int getExitCode() { return exitCode; }
}

