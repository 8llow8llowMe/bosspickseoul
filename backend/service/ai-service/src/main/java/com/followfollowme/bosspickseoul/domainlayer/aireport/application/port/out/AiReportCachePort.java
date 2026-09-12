package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import java.util.Optional;

public interface AiReportCachePort {

    Optional<CommercialAiReportSnapshot> getCommercialReport(String commercialCode, String serviceCode, String periodCode);

    void saveCommercialReport(String commercialCode, String serviceCode, String periodCode, CommercialAiReportSnapshot reportSnapshot);

    Optional<CommercialComparisonAiReportSnapshot> getCommercialComparisonReport(
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
        CommercialComparisonAiReportSnapshot reportSnapshot
    );

    Optional<DistrictAiReportSnapshot> getDistrictReport(String districtCode, String periodCode);

    void saveDistrictReport(String districtCode, String periodCode, DistrictAiReportSnapshot reportSnapshot);

    Optional<AdministrationAiReportSnapshot> getAdministrationReport(String administrationCode, String periodCode);

    void saveAdministrationReport(String administrationCode, String periodCode, AdministrationAiReportSnapshot reportSnapshot);
}
