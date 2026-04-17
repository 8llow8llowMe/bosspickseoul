package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import java.util.Optional;

public interface AiReportCachePort {

    Optional<CommercialAiReportInfo> getCommercialReport(String commercialCode, String serviceCode, String periodCode);

    void saveCommercialReport(String commercialCode, String serviceCode, String periodCode, CommercialAiReportInfo reportInfo);

    Optional<CommercialComparisonAiReportInfo> getCommercialComparisonReport(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    );

    void saveCommercialComparisonReport(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode,
        CommercialComparisonAiReportInfo reportInfo
    );

    Optional<DistrictAiReportInfo> getDistrictReport(String districtCode, String periodCode);

    void saveDistrictReport(String districtCode, String periodCode, DistrictAiReportInfo reportInfo);

    Optional<AdministrationAiReportInfo> getAdministrationReport(String administrationCode, String periodCode);

    void saveAdministrationReport(String administrationCode, String periodCode, AdministrationAiReportInfo reportInfo);
}
