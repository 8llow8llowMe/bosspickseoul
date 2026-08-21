package com.followfollowme.bosspickseoul.domainlayer.areaboundary.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.areaboundary.domain.model.AreaBoundary;
import java.util.List;

public interface AreaBoundaryBulkPort {

    void upsertAll(List<AreaBoundary> areaBoundaries);
}
