package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.model.AreaBoundary;
import java.util.List;

public interface AreaBoundaryRepositoryPort {

    List<AreaBoundary> findAllByAreaTypeAndBoundingBox(AreaType areaType, double minLng, double minLat, double maxLng, double maxLat);
}
