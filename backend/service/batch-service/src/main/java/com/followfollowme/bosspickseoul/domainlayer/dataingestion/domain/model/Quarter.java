package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

public record Quarter(String value) implements Comparable<Quarter> {
    public Quarter {
        if (value == null || !value.matches("20[0-9]{2}[1-4]")) {
            throw new IllegalArgumentException("period must be YYYYQ (2000-2099, quarter 1-4)");
        }
    }

    @Override
    public int compareTo(Quarter other) { return value.compareTo(other.value); }
}

