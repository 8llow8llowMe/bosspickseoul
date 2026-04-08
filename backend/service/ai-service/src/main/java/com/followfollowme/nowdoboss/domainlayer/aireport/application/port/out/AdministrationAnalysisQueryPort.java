package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;

public interface AdministrationAnalysisQueryPort {

    AdministrationDetailQueryResult getAdministrationDetail(String administrationCode, String periodCode);
}