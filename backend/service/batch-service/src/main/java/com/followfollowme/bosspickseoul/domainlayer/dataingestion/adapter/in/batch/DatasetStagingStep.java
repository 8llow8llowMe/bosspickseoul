package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.RowValidation;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRowProcessor;
import java.util.ArrayList;
import java.util.List;
import org.springframework.batch.item.Chunk;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;

/**
 * Validates and stages one chunk. The step-scoped instance resolves the import request once,
 * so job parameters are not re-parsed and re-validated for every source row.
 */
public class DatasetStagingStep implements ItemProcessor<SourceRow, RowValidation>, ItemWriter<RowValidation> {
    private final DatasetRowProcessor rows;
    private final DatasetReleasePort releases;
    private final ImportRequest request;

    public DatasetStagingStep(DatasetRowProcessor rows, DatasetReleasePort releases, ImportRequest request) {
        this.rows = rows;
        this.releases = releases;
        this.request = request;
    }

    @Override
    public RowValidation process(SourceRow row) {
        return rows.process(request, row);
    }

    @Override
    public void write(Chunk<? extends RowValidation> chunk) {
        List<FactRow> accepted = new ArrayList<>(chunk.size());
        for (RowValidation result : chunk) {
            if (result.accepted()) accepted.add(result.fact());
            else releases.reject(request, result.source(), result.rejectionReason());
        }
        if (!accepted.isEmpty()) releases.stage(request, accepted);
    }
}
