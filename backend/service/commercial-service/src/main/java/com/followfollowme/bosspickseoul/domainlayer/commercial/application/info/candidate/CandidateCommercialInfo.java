package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate;

import java.util.List;
import lombok.Builder;

@Builder
public record CandidateCommercialInfo(
    int rank,
    String commercialCode,
    String commercialName,
    Double compositeScore,
    String grade,
    String summaryLabel,
    String selectionReason,
    String opportunityLabel,
    String riskLabel,
    List<MetricBreakdownInfo> metricBreakdown,
    List<String> reasonTags,
    List<BlueOceanCategoryInfo> blueOceanCategories
) {

    public CandidateCommercialInfo withBlueOceanCategories(List<BlueOceanCategoryInfo> categories) {
        return new CandidateCommercialInfo(
            rank, commercialCode, commercialName, compositeScore, grade, summaryLabel,
            selectionReason, opportunityLabel, riskLabel, metricBreakdown, reasonTags, categories
        );
    }
}
