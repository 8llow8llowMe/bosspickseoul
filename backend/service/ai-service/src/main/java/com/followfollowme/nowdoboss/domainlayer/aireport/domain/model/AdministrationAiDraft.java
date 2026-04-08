package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import java.util.List;

public record AdministrationAiDraft(
    String summary,
    String marketStatus,
    List<String> recommendedBusinessCategories,
    List<String> cautionBusinessCategories,
    String businessInsight
) {
}