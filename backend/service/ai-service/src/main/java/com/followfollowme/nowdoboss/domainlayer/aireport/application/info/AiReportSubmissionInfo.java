package com.followfollowme.nowdoboss.domainlayer.aireport.application.info;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import lombok.Builder;

@Builder
public record AiReportSubmissionInfo(
    AiReportSubmissionStatus submissionStatus,
    AiReportJobType jobType,
    String jobId,
    CommercialAiReportInfo commercialReport,
    CommercialComparisonAiReportInfo comparisonReport,
    DistrictAiReportInfo districtReport,
    AdministrationAiReportInfo administrationReport
) {

    public enum AiReportSubmissionStatus {
        CACHED,
        ACCEPTED
    }

    public static AiReportSubmissionInfo cached(AiReportJobType jobType, CommercialAiReportInfo commercialReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .commercialReport(commercialReport)
            .build();
    }

    public static AiReportSubmissionInfo cachedComparison(AiReportJobType jobType, CommercialComparisonAiReportInfo comparisonReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .comparisonReport(comparisonReport)
            .build();
    }

    public static AiReportSubmissionInfo cachedDistrict(AiReportJobType jobType, DistrictAiReportInfo districtReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .districtReport(districtReport)
            .build();
    }

    public static AiReportSubmissionInfo cachedAdministration(AiReportJobType jobType, AdministrationAiReportInfo administrationReport) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.CACHED)
            .jobType(jobType)
            .administrationReport(administrationReport)
            .build();
    }

    public static AiReportSubmissionInfo accepted(AiReportJobType jobType, String jobId) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED)
            .jobType(jobType)
            .jobId(jobId)
            .build();
    }
}
