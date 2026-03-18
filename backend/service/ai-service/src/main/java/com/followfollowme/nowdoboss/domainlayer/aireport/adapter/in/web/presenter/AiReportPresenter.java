package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import org.springframework.stereotype.Component;

@Component
public class AiReportPresenter {

    public CommercialAiReportResponse toCommercialResponse(CommercialAiReportInfo info) {
        return CommercialAiReportResponse.builder()
            .summary(info.summary())
            .strengths(info.strengths())
            .risks(info.risks())
            .recommendedCustomerSegments(info.recommendedCustomerSegments())
            .recommendedOperatingHours(info.recommendedOperatingHours())
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
}
