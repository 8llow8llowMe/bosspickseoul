package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public record SourceRow(long rowNumber, Map<String, String> fields) {
    public SourceRow { fields = Collections.unmodifiableMap(new LinkedHashMap<>(fields)); }
}

