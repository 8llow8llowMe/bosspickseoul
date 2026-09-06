package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceReceipt;

public interface DatasetSourcePort {
    SourceSession open(ImportRequest request);
    interface SourceSession extends AutoCloseable {
        SourceRow read();
        SourceReceipt receipt();
        @Override void close();
    }
}

