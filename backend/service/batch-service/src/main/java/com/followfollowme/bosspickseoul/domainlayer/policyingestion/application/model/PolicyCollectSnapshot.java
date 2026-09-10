package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PolicyCollectSnapshot(
    List<PolicyUpsert> rows,
    LocalDateTime seenAt,
    LocalDate hideEndAt
) {
}
