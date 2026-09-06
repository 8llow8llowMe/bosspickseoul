package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialSourcePort;
import java.nio.file.Path;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class SpatialImportProcessor {
    private final SpatialSourcePort source;
    private final SpatialReleasePort releases;

    public SpatialImportProcessor(SpatialSourcePort source, SpatialReleasePort releases) {
        this.source = source;
        this.releases = releases;
    }

    public SpatialImportResult importSnapshot(Path sourceFile, String expectedSpatialVersion, boolean dryRun) {
        if (expectedSpatialVersion == null || !expectedSpatialVersion.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}")) {
            throw new IllegalArgumentException("A safe spatialVersion of at most 64 characters is required");
        }
        SpatialSnapshot snapshot = source.read(sourceFile);
        if (!expectedSpatialVersion.equals(snapshot.spatialVersion())) {
            throw new IllegalArgumentException("Source spatialVersion differs from requested spatialVersion");
        }
        validate(snapshot);
        boolean published = !dryRun && releases.publish(snapshot);
        return new SpatialImportResult(snapshot.spatialVersion(), snapshot.checksum(),
            snapshot.areas().size(), dryRun, published);
    }

    private void validate(SpatialSnapshot snapshot) {
        Map<SpatialAreaType, Set<String>> codes = new EnumMap<>(SpatialAreaType.class);
        for (SpatialAreaType type : SpatialAreaType.values()) codes.put(type, new HashSet<>());
        for (SpatialArea area : snapshot.areas()) {
            if (area.areaType() == null || area.areaCode() == null || !area.areaCode().matches("[0-9]{5,8}")) {
                throw new IllegalArgumentException("Invalid spatial area type or code");
            }
            if (area.areaName() == null || area.areaName().isBlank() || area.areaName().length() > 255) {
                throw new IllegalArgumentException("Area name is required and must fit 255 characters");
            }
            if (!codes.get(area.areaType()).add(area.areaCode())) {
                throw new IllegalArgumentException("Duplicate spatial area: " + area.areaType() + "/" + area.areaCode());
            }
        }
        for (SpatialAreaType type : SpatialAreaType.values()) {
            Integer expected = snapshot.expectedCounts().get(type);
            if (expected == null || expected <= 0 || codes.get(type).size() != expected) {
                throw new IllegalArgumentException("Expected count mismatch for " + type);
            }
        }
        for (SpatialArea area : snapshot.areas()) {
            SpatialAreaType parentType = switch (area.areaType()) {
                case DISTRICT -> null;
                case ADMINISTRATION -> SpatialAreaType.DISTRICT;
                case COMMERCIAL -> SpatialAreaType.ADMINISTRATION;
            };
            if (parentType == null ? area.parentCode() != null : !codes.get(parentType).contains(area.parentCode())) {
                throw new IllegalArgumentException("Invalid spatial parent for " + area.areaType() + "/" + area.areaCode());
            }
        }
    }
}
