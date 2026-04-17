package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AdministrationAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialComparisonAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;

public interface AiReportWebUseCase {

    CommercialAiReportResponse getCommercialReport(String commercialCode, String serviceCode, String periodCode);

    CommercialComparisonAiReportResponse getCommercialComparisonReport(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    );

    DistrictAiReportResponse getDistrictReport(String districtCode, String periodCode);

    AdministrationAiReportResponse getAdministrationReport(String administrationCode, String periodCode);
}
