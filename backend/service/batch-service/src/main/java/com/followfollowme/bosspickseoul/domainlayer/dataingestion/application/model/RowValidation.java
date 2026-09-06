package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record RowValidation(SourceRow source, FactRow fact, String rejectionReason) {
    public boolean accepted() { return fact != null; }
}

