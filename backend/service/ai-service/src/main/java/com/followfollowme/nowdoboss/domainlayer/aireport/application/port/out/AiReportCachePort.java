package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import java.util.Optional;

public interface AiReportCachePort {

    Optional<CommercialAiReportInfo> getCommercialReport(String commercialCode, String serviceCode, String periodCode);

    void saveCommercialReport(String commercialCode, String serviceCode, String periodCode, CommercialAiReportInfo reportInfo);

    Optional<DistrictAiReportInfo> getDistrictReport(String districtCode, String periodCode);

    void saveDistrictReport(String districtCode, String periodCode, DistrictAiReportInfo reportInfo);
}
