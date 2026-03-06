package com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.areaboundarybatch.domain.model.AreaBoundary;
import java.util.List;

public interface AreaBoundaryJdbcPort {

    void upsertAll(List<AreaBoundary> areaBoundaries);
}
