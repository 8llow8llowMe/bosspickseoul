package com.followfollowme.nowdoboss.domainlayer.aireport.application.info;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import lombok.Builder;

@Builder
public record AiReportSubmissionInfo(
    AiReportSubmissionStatus submissionStatus,
    AiReportJobType jobType,
    String jobId,
    CommercialAiReportInfo commercialReport
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

    public static AiReportSubmissionInfo accepted(AiReportJobType jobType, String jobId) {
        return AiReportSubmissionInfo.builder()
            .submissionStatus(AiReportSubmissionStatus.ACCEPTED)
            .jobType(jobType)
            .jobId(jobId)
            .build();
    }
}
