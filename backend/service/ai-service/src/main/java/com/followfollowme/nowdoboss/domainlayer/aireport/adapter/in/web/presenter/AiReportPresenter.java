package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AdministrationAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialComparisonAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import org.springframework.stereotype.Component;

@Component
public class AiReportPresenter {

    public CommercialAiReportResponse toCommercialResponse(CommercialAiReportInfo info) {
        return CommercialAiReportResponse.builder()
            .summary(info.summary())
            .strengths(info.strengths())
            .risks(info.risks())
            .recommendedBusinessCategories(info.recommendedBusinessCategories())
            .recommendedCustomerSegments(info.recommendedCustomerSegments())
            .recommendedOperatingHours(info.recommendedOperatingHours())
            .avoidOperatingHours(info.avoidOperatingHours())
            .targetAgeGroups(info.targetAgeGroups())
            .targetGenders(info.targetGenders())
            .operationTips(info.operationTips())
            .businessInsight(info.businessInsight())
            .generatedAt(info.generatedAt())
            .build();
    }

    public CommercialComparisonAiReportResponse toCommercialComparisonResponse(CommercialComparisonAiReportInfo info) {
        return CommercialComparisonAiReportResponse.builder()
            .summary(info.summary())
            .recommendedSide(info.recommendedSide())
            .recommendedReasons(info.recommendedReasons())
            .riskComparison(info.riskComparison())
            .timeSlotInsight(info.timeSlotInsight())
            .customerSegmentInsight(info.customerSegmentInsight())
            .operationStrategy(info.operationStrategy())
            .businessInsight(info.businessInsight())
            .generatedAt(info.generatedAt())
            .build();
    }

    public DistrictAiReportResponse toDistrictResponse(DistrictAiReportInfo info) {
        return DistrictAiReportResponse.builder()
            .summary(info.summary())
            .marketStatus(info.marketStatus())
            .recommendedBusinessCategories(info.recommendedBusinessCategories())
            .cautionBusinessCategories(info.cautionBusinessCategories())
            .businessInsight(info.businessInsight())
            .generatedAt(info.generatedAt())
            .build();
    }

    public AdministrationAiReportResponse toAdministrationResponse(AdministrationAiReportInfo info) {
        return AdministrationAiReportResponse.builder()
            .summary(info.summary())
            .marketStatus(info.marketStatus())
            .recommendedBusinessCategories(info.recommendedBusinessCategories())
            .cautionBusinessCategories(info.cautionBusinessCategories())
            .businessInsight(info.businessInsight())
            .generatedAt(info.generatedAt())
            .build();
    }
}
