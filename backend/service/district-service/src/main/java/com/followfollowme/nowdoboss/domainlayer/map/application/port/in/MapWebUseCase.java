package com.followfollowme.nowdoboss.domainlayer.map.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;

public interface MapWebUseCase {

    MapAreaCoordsResponse getCommercialAreaCoords(double lngSW, double latSW, double lngNE, double latNE);

    MapAreaCoordsResponse getAdministrationAreaCoords(double lngSW, double latSW, double lngNE, double latNE);

    MapAreaCoordsResponse getDistrictAreaCoords(double lngSW, double latSW, double lngNE, double latNE);
}
