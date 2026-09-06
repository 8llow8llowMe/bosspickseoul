package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

public record ValidationResult(long acceptedRows, long rejectedRows, long duplicateKeys, long unmappedRows) {
    public boolean valid(long expectedRows) {
        return acceptedRows == expectedRows && rejectedRows == 0 && duplicateKeys == 0 && unmappedRows == 0;
    }
}

