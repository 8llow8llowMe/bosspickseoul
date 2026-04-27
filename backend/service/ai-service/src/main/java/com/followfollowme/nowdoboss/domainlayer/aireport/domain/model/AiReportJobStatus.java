package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

public enum AiReportJobStatus {

    PENDING,
    RUNNING,
    COMPLETED,
    FAILED;

    public boolean isTerminal() {
        return this == COMPLETED || this == FAILED;
    }

    public boolean isInFlight() {
        return this == PENDING || this == RUNNING;
    }
}
