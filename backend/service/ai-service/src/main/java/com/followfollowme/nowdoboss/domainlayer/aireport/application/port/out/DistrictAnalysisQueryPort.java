package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.fasterxml.jackson.databind.JsonNode;

public interface DistrictAnalysisQueryPort {

    JsonNode getDistrictDetail(String districtCode, String periodCode);

    JsonNode getCommercialAdministration(String commercialCode);
}
