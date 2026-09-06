package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSnapshot;
import java.nio.file.Path;

public interface SpatialSourcePort {
    SpatialSnapshot read(Path sourceFile);
}
