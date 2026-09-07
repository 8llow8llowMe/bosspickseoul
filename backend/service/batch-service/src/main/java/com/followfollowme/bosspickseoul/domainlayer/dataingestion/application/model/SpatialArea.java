package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.AreaScope;

public record SpatialArea(AreaScope areaType, String areaCode, String areaName,
                          String parentCode, String boundaryGeoJson) {}
