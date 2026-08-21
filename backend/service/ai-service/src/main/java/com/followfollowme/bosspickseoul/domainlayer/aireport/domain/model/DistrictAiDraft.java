package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

import java.util.List;

public record DistrictAiDraft(
    String summary,
    String marketStatus,
    List<String> recommendedBusinessCategories,
    List<String> cautionBusinessCategories,
    String businessInsight
) {

}
