package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import java.util.List;

public interface DatasetReleasePort {
    void begin(ImportRequest request);
    void stage(ImportRequest request, List<FactRow> rows);
    void reject(ImportRequest request, SourceRow row, String reason);
    ValidationResult validate(ImportRequest request, SourceReceipt receipt);
    void complete(ImportRequest request, SourceReceipt receipt, ValidationResult result);
    void fail(ImportRequest request, String reason);
}

