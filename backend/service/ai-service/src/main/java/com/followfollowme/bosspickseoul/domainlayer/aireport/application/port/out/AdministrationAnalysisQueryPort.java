package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;

public interface AdministrationAnalysisQueryPort {

    AdministrationDetailQueryResult getAdministrationDetail(String administrationCode, String periodCode);
}