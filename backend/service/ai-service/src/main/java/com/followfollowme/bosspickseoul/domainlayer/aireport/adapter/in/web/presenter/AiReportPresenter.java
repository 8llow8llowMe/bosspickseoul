package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AdministrationAiReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.CommercialComparisonAiReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.DistrictAiReportInfo;
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

    public AiReportSubmissionResponse toSubmissionResponse(AiReportSubmissionInfo info) {
        return AiReportSubmissionResponse.builder()
            .submissionStatus(info.submissionStatus().toMetadata())
            .jobType(info.jobType().toMetadata())
            .jobId(info.jobId())
            .commercialReport(info.commercialReport() == null ? null : toCommercialResponse(info.commercialReport()))
            .commercialComparisonReport(
                info.commercialComparisonReport() == null ? null : toCommercialComparisonResponse(info.commercialComparisonReport())
            )
            .districtReport(info.districtReport() == null ? null : toDistrictResponse(info.districtReport()))
            .administrationReport(
                info.administrationReport() == null ? null : toAdministrationResponse(info.administrationReport())
            )
            .build();
    }

    public AiReportJobStatusResponse toJobStatusResponse(AiReportJobInfo info) {
        return AiReportJobStatusResponse.builder()
            .jobId(info.jobId())
            .jobType(info.jobType().toMetadata())
            .status(info.status().toMetadata())
            // 진행 중일 때만 노출 — 종결 상태에서는 진행 문구가 화면에 남을 이유가 없다.
            .progressMessages(info.status().isInFlight() ? info.jobType().getProgressMessages() : null)
            .commercialReport(info.commercialReport() == null ? null : toCommercialResponse(info.commercialReport()))
            .commercialComparisonReport(
                info.commercialComparisonReport() == null ? null : toCommercialComparisonResponse(info.commercialComparisonReport())
            )
            .districtReport(info.districtReport() == null ? null : toDistrictResponse(info.districtReport()))
            .administrationReport(
                info.administrationReport() == null ? null : toAdministrationResponse(info.administrationReport())
            )
            .errorCode(info.errorCode())
            .errorMessage(info.errorMessage())
            .build();
    }
}
