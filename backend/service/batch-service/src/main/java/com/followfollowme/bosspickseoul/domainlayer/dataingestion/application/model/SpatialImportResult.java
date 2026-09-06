package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record SpatialImportResult(String spatialVersion, String checksum, int areaCount,
                                  boolean dryRun, boolean published) {}
