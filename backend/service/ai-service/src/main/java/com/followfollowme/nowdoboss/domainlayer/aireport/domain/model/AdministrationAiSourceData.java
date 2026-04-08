package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import java.util.List;

public record AdministrationAiSourceData(
    String administrationCode,
    String periodCode,
    AdministrationDistrictQueryResult districtInfo,
    AdministrationDetailQueryResult detail,
    List<AdministrationCommercialQueryResult> commercials
) {
}
