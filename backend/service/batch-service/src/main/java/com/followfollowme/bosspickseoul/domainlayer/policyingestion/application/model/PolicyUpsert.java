package com.followfollowme.bosspickseoul.domainlayer.policyingestion.application.model;

import java.time.LocalDate;

public record PolicyUpsert(
    String externalId,
    String title,
    String organization,
    String supportType,
    String targetSummary,
    String supportContent,
    String districtCode,
    String serviceCategoryCode,
    LocalDate applyStartAt,
    LocalDate applyEndAt,
    String detailUrl
) {
}
