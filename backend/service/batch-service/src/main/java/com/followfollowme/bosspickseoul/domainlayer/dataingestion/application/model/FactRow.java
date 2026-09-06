package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public record FactRow(long rowNumber, String areaCode, String serviceCode, Map<String, String> fields) {
    public FactRow { fields = Collections.unmodifiableMap(new LinkedHashMap<>(fields)); }
}

