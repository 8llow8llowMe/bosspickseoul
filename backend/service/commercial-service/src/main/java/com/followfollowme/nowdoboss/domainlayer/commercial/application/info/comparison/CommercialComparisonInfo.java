package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparisonInfo(
    CommercialComparisonTargetInfo left,
    CommercialComparisonTargetInfo right,
    List<ComparisonMetricInfo> salesMetrics,
    List<ComparisonMetricInfo> footTrafficMetrics,
    List<ComparisonMetricInfo> storeMetrics,
    List<ComparisonMetricInfo> spendingMetrics,
    List<ComparisonMetricInfo> residentPopulationMetrics,
    List<ComparisonMetricInfo> facilityMetrics,
    List<ComparisonMetricInfo> salesTimeSlotMetrics,
    List<ComparisonMetricInfo> salesAgeMetrics,
    List<ComparisonMetricInfo> footTrafficTimeSlotMetrics,
    List<ComparisonMetricInfo> footTrafficAgeMetrics,
    List<String> highlights
) {

}
