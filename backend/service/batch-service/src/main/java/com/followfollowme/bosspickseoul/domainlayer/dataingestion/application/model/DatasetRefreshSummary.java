package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.time.Instant;
import java.util.List;

/** run 1회 요약. */
public record DatasetRefreshSummary(Instant firedAt, boolean publish, int apiCalls, List<DatasetRefreshSlot> slots) {
    public DatasetRefreshSummary {
        slots = List.copyOf(slots);
    }

    public long count(DatasetRefreshResult result) {
        return slots.stream().filter(slot -> slot.result() == result).count();
    }
}
