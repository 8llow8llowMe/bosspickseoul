package com.followfollowme.nowdoboss.domainlayer.areaboundary.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.areaboundary.domain.model.AreaBoundary;
import java.util.List;

public interface AreaBoundaryBulkPort {

    void upsertAll(List<AreaBoundary> areaBoundaries);
}
