package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportJobInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;

public interface AiReportWebUseCase {

    CommercialAiReportInfo getCommercialReport(String commercialCode, String serviceCode, String periodCode);

    CommercialComparisonAiReportInfo getCommercialComparisonReport(CommercialComparisonAiQuery query);

    DistrictAiReportInfo getDistrictReport(String districtCode, String periodCode);

    AdministrationAiReportInfo getAdministrationReport(String administrationCode, String periodCode);

    AiReportSubmissionInfo submitCommercialReport(Long memberId, String commercialCode, String serviceCode, String periodCode);

    AiReportJobInfo getJobInfo(String jobId, Long memberId);
}
