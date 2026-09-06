package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SpatialSnapshot(String spatialVersion, String checksum, Instant sourceUpdatedAt,
                              Map<SpatialAreaType, Integer> expectedCounts, List<SpatialArea> areas) {
    public SpatialSnapshot {
        expectedCounts = Map.copyOf(expectedCounts);
        areas = List.copyOf(areas);
    }
}
