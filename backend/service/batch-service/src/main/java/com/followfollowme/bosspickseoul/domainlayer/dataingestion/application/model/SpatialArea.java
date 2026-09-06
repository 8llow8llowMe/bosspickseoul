package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record SpatialArea(SpatialAreaType areaType, String areaCode, String areaName,
                          String parentCode, String boundaryGeoJson) {}
