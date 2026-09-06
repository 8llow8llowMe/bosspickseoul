package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.in.batch;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import org.springframework.batch.core.StepExecution;
import org.springframework.batch.item.ExecutionContext;
import org.springframework.batch.item.ItemStreamReader;

public class DatasetItemReader implements ItemStreamReader<SourceRow> {
    private final DatasetSourcePort source;
    private final ImportRequest request;
    private final StepExecution stepExecution;
    private DatasetSourcePort.SourceSession session;

    public DatasetItemReader(DatasetSourcePort source, ImportRequest request, StepExecution stepExecution) {
        this.source = source;
        this.request = request;
        this.stepExecution = stepExecution;
    }

    @Override
    public void open(ExecutionContext context) {
        // A restart clears this run's staging in prepare and reads a new immutable raw attempt from its beginning.
        session = source.open(request);
    }

    @Override
    public SourceRow read() {
        SourceRow row = session.read();
        if (row == null) {
            SourceReceipt receipt = session.receipt();
            ExecutionContext context = stepExecution.getExecutionContext();
            context.putString("sourceChecksum", receipt.checksum());
            context.putString("rawLocation", receipt.rawLocation());
            context.putLong("sourceInputRows", receipt.inputRows());
        }
        return row;
    }

    @Override public void update(ExecutionContext context) {}
    @Override public void close() { if (session != null) session.close(); }
}

