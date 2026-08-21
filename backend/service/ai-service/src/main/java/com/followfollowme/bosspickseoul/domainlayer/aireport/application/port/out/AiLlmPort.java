package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AdministrationAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.DistrictAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiDraft;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiDraft;

public interface AiLlmPort {

    AiGenerationResult<CommercialAiDraft> generateCommercialReport(CommercialAiSourceData sourceData);

    AiGenerationResult<CommercialComparisonAiDraft> generateCommercialComparisonReport(CommercialComparisonAiSourceData sourceData);

    AiGenerationResult<DistrictAiDraft> generateDistrictReport(DistrictAiSourceData sourceData);

    AiGenerationResult<AdministrationAiDraft> generateAdministrationReport(AdministrationAiSourceData sourceData);
}
