package com.followfollowme.nowdoboss.domainlayer.aireport.application.info;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AiReportJobType;
import lombok.Builder;

@Builder
public record AiReportJobInfo(
    String jobId,
    AiReportJobType jobType,
    AiReportJobStatus status,
    CommercialAiReportInfo commercialReport,
    CommercialComparisonAiReportInfo comparisonReport,
    DistrictAiReportInfo districtReport,
    AdministrationAiReportInfo administrationReport,
    String errorCode,
    String errorMessage
) {

}
