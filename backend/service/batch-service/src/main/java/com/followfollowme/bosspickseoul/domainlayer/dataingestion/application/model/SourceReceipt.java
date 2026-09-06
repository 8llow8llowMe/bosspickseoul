package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record SourceReceipt(String checksum, String rawLocation, long inputRows) {}

