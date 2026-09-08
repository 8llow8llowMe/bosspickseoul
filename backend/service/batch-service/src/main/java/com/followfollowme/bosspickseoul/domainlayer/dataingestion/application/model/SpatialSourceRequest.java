package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.nio.file.Path;
import java.time.Instant;

/**
 * Where a spatial snapshot comes from. {@code GEOJSON} reads a prepared FeatureCollection file whose own
 * {@code spatialVersion} must match; {@code LEGACY} lifts the 20233 geometry the services already use out of
 * {@code area_boundary} and {@code commercial_region_mapping}, labelled with the version given here.
 */
public record SpatialSourceRequest(Kind kind, Path sourceFile, String spatialVersion, Instant sourceUpdatedAt) {
    public enum Kind { GEOJSON, LEGACY }

    public SpatialSourceRequest {
        if (kind == null) throw new IllegalArgumentException("spatial source kind required");
        if (spatialVersion == null || !spatialVersion.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}"))
            throw new IllegalArgumentException("A safe spatialVersion of at most 64 characters is required");
        if (kind == Kind.GEOJSON && sourceFile == null) throw new IllegalArgumentException("sourceFile required for GEOJSON");
        if (kind == Kind.LEGACY && sourceUpdatedAt == null) throw new IllegalArgumentException("sourceUpdatedAt required for LEGACY");
    }

    public static SpatialSourceRequest geoJson(Path sourceFile, String spatialVersion) {
        return new SpatialSourceRequest(Kind.GEOJSON, sourceFile, spatialVersion, null);
    }
}
