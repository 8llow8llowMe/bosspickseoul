package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSourceRequest;

public interface SpatialSourcePort {
    SpatialSnapshot read(SpatialSourceRequest request);
}
