package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record ProjectionResult(String sourceRunId, int rowCount, boolean written) {
}
