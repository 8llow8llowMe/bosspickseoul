package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;

public interface SpatialReleasePort {
    /** Returns false if an identical immutable snapshot is already ready. */
    boolean publish(SpatialSnapshot snapshot);
}
