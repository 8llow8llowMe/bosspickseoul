package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.AreaScope;
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

    public SpatialImportResult importSnapshot(SpatialSourceRequest request, boolean dryRun) {
        SpatialSnapshot snapshot = source.read(request);
        if (!request.spatialVersion().equals(snapshot.spatialVersion())) {
            throw new IllegalArgumentException("Source spatialVersion differs from requested spatialVersion");
        }
        validate(snapshot);
        boolean published = !dryRun && releases.publish(snapshot);
        return new SpatialImportResult(snapshot.spatialVersion(), snapshot.checksum(),
            snapshot.areas().size(), dryRun, published);
    }

    private void validate(SpatialSnapshot snapshot) {
        Map<AreaScope, Set<String>> codes = new EnumMap<>(AreaScope.class);
        for (AreaScope type : AreaScope.values()) codes.put(type, new HashSet<>());
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
        for (AreaScope type : AreaScope.values()) {
            Integer expected = snapshot.expectedCounts().get(type);
            if (expected == null || expected <= 0 || codes.get(type).size() != expected) {
                throw new IllegalArgumentException("Expected count mismatch for " + type);
            }
        }
        for (SpatialArea area : snapshot.areas()) {
            AreaScope parentType = area.areaType().parent();
            if (parentType == null ? area.parentCode() != null : !codes.get(parentType).contains(area.parentCode())) {
                throw new IllegalArgumentException("Invalid spatial parent for " + area.areaType() + "/" + area.areaCode());
            }
        }
    }
}
