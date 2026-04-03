package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;

public interface RegionAnalysisQueryPort {

    CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode);
}
