package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;

public record CommercialComparisonQueryResult(
    CommercialComparisonTargetQueryResult left,
    CommercialComparisonTargetQueryResult right,
    String comparisonSummary,
    CodeNameDescriptionMetadata recommendedSide,
    List<String> recommendedReasons,
    List<String> cautionPoints,
    List<String> dominantTimeSlots,
    List<String> dominantAgeGroups,
    String businessFitSummary,
    List<ComparisonMetricQueryResult> salesMetrics,
    List<ComparisonMetricQueryResult> footTrafficMetrics,
    List<ComparisonMetricQueryResult> storeMetrics,
    List<ComparisonMetricQueryResult> spendingMetrics,
    List<ComparisonMetricQueryResult> residentPopulationMetrics,
    List<ComparisonMetricQueryResult> facilityMetrics,
    List<ComparisonMetricQueryResult> salesTimeSlotMetrics,
    List<ComparisonMetricQueryResult> salesAgeMetrics,
    List<ComparisonMetricQueryResult> salesAgeGenderMetrics,
    List<ComparisonMetricQueryResult> footTrafficTimeSlotMetrics,
    List<ComparisonMetricQueryResult> footTrafficAgeMetrics,
    List<ComparisonMetricQueryResult> footTrafficAgeGenderMetrics,
    List<String> comparisonHighlights,
    List<String> highlights
) {

}
