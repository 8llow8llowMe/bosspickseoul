package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ChangeCommercialTypedRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
import java.util.List;
import java.util.Optional;

public interface TypedFactProjectionPort {

    Optional<String> activeRunId(ProjectionRequest request);

    List<FactRow> facts(String releaseRunId);

    int replaceChangeCommercial(ProjectionRequest request, List<ChangeCommercialTypedRow> rows);
}
