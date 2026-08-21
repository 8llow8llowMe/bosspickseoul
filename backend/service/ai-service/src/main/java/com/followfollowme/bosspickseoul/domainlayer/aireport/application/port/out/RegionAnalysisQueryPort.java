package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAreaQueryResult;
import java.util.List;

public interface RegionAnalysisQueryPort {

    AdministrationDistrictQueryResult getAdministrationDistrict(String administrationCode);

    List<AdministrationCommercialQueryResult> getCommercialsByAdministration(String administrationCode);

    CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode);

    DistrictAreaQueryResult getDistrict(String districtCode);
}
