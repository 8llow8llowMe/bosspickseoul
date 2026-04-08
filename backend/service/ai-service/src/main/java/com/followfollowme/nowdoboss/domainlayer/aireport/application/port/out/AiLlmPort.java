package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.nowdoboss.domainlayer.aireport.domain.model.DistrictAiDraft;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.DistrictAiSourceData;

public interface AiLlmPort {

    CommercialAiDraft generateCommercialReport(CommercialAiSourceData sourceData);

    DistrictAiDraft generateDistrictReport(DistrictAiSourceData sourceData);

    AdministrationAiDraft generateAdministrationReport(AdministrationAiSourceData sourceData);
}
