package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparisonAiSourceData(
    String leftCommercialCode,
    String leftCommercialName,
    String leftDistrictName,
    String leftAdministrationName,
    String rightCommercialCode,
    String rightCommercialName,
    String rightDistrictName,
    String rightAdministrationName,
    String serviceCode,
    String periodCode,
    String comparisonSummary,
    String recommendedSide,
    List<String> recommendedReasons,
    List<String> cautionPoints,
    List<String> dominantTimeSlots,
    List<String> dominantAgeGroups,
    String businessFitSummary,
    List<String> comparisonHighlights,
    List<String> salesMetricSummaries,
    List<String> footTrafficMetricSummaries,
    List<String> storeMetricSummaries,
    List<String> spendingMetricSummaries,
    List<String> residentPopulationMetricSummaries,
    List<String> facilityMetricSummaries,
    List<String> salesTimeSlotMetricSummaries,
    List<String> salesAgeMetricSummaries,
    List<String> salesAgeGenderMetricSummaries,
    List<String> footTrafficTimeSlotMetricSummaries,
    List<String> footTrafficAgeMetricSummaries,
    List<String> footTrafficAgeGenderMetricSummaries
) {
}
