package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query.CommercialAdministrationQueryResult;

public interface CommercialRegionQueryPort {

    CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode);
}
