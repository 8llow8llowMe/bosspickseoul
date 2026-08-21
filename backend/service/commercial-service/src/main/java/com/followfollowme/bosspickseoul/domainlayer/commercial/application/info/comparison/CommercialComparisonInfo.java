package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparisonInfo(
    CommercialComparisonTargetInfo left,
    CommercialComparisonTargetInfo right,
    String comparisonSummary,
    CodeNameDescriptionMetadata recommendedSide,
    List<String> recommendedReasons,
    List<String> cautionPoints,
    List<String> dominantTimeSlots,
    List<String> dominantAgeGroups,
    String businessFitSummary,
    List<ComparisonMetricInfo> salesMetrics,
    List<ComparisonMetricInfo> footTrafficMetrics,
    List<ComparisonMetricInfo> storeMetrics,
    List<ComparisonMetricInfo> spendingMetrics,
    List<ComparisonMetricInfo> residentPopulationMetrics,
    List<ComparisonMetricInfo> facilityMetrics,
    List<ComparisonMetricInfo> salesTimeSlotMetrics,
    List<ComparisonMetricInfo> salesAgeMetrics,
    List<ComparisonMetricInfo> salesAgeGenderMetrics,
    List<ComparisonMetricInfo> footTrafficTimeSlotMetrics,
    List<ComparisonMetricInfo> footTrafficAgeMetrics,
    List<ComparisonMetricInfo> footTrafficAgeGenderMetrics,
    List<String> comparisonHighlights,
    List<String> highlights
) {

}
