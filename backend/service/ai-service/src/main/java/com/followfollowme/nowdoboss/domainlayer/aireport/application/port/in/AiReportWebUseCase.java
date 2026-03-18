package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;

public interface AiReportWebUseCase {

    CommercialAiReportResponse getCommercialReport(String commercialCode, String serviceCode, String periodCode);

    DistrictAiReportResponse getDistrictReport(String districtCode, String periodCode);
}
