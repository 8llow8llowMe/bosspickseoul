package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.RowValidation;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRowProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.batch.item.Chunk;

class DatasetStagingStepTest {
    private final DatasetReleasePort releases = mock(DatasetReleasePort.class);
    private final ImportRequest request = new ImportRequest("test-run", Dataset.SALES_COMMERCIAL, new Quarter("20241"),
        "standard-2024", "seoul-v1", ImportRequest.SourceType.CSV, java.nio.file.Path.of("source.csv"), "UTF-8",
        true, 1, Instant.parse("2026-09-06T00:00:00Z"));
    private final DatasetStagingStep step = new DatasetStagingStep(new DatasetRowProcessor(), releases, request);

    @Test
    void stagesAcceptedRowsInOneBatchAndAuditsTheRejectedOnes() {
        RowValidation accepted = step.process(new SourceRow(1, fields("3110008", "1000")));
        RowValidation alsoAccepted = step.process(new SourceRow(2, fields("3110015", "2000")));
        RowValidation rejected = step.process(new SourceRow(3, fields("bad-code", "3000")));
        step.write(Chunk.of(accepted, alsoAccepted, rejected));

        ArgumentCaptor<List<FactRow>> staged = ArgumentCaptor.captor();
        verify(releases).stage(eq(request), staged.capture());
        assertThat(staged.getValue()).extracting(FactRow::areaCode).containsExactly("3110008", "3110015");
        verify(releases).reject(eq(request), eq(rejected.source()), eq("AREA_CODE_INVALID"));
    }

    @Test
    void aChunkWithNothingAcceptedNeverOpensAStagingBatch() {
        RowValidation rejected = step.process(new SourceRow(1, fields("bad-code", "1000")));
        step.write(Chunk.of(rejected));
        verify(releases, never()).stage(any(), any());
        verify(releases).reject(eq(request), eq(rejected.source()), eq("AREA_CODE_INVALID"));
    }

    private Map<String, String> fields(String areaCode, String sales) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String field : Dataset.SALES_COMMERCIAL.requiredMetrics()) {
            fields.put(field, field.endsWith("_AMT") || field.endsWith("_CO") || field.endsWith("_RT") ? "1" : "A");
        }
        fields.put("TRDAR_CD", areaCode);
        fields.put("SVC_INDUTY_CD", "CS100001");
        fields.put("THSMON_SELNG_AMT", sales);
        return fields;
    }
}
