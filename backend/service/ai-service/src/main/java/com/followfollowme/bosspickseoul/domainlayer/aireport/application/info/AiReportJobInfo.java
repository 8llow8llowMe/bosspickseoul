package com.followfollowme.bosspickseoul.domainlayer.aireport.application.info;

import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import lombok.Builder;

@Builder
public record AiReportJobInfo(
    String jobId,
    AiReportJobType jobType,
    AiReportJobStatus status,
    CommercialAiReportInfo commercialReport,
    CommercialComparisonAiReportInfo commercialComparisonReport,
    DistrictAiReportInfo districtReport,
    AdministrationAiReportInfo administrationReport,
    String errorCode,
    String errorMessage
) {

}
