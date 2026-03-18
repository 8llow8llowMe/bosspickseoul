package com.followfollowme.nowdoboss.domainlayer.aireport.application.info;

import java.time.LocalDateTime;
import java.util.List;

public record DistrictAiReportInfo(
    String summary,
    String marketStatus,
    List<String> recommendedBusinessCategories,
    List<String> cautionBusinessCategories,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
