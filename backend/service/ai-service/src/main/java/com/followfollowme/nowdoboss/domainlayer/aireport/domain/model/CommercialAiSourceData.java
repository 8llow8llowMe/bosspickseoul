package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.fasterxml.jackson.databind.JsonNode;

public record CommercialAiSourceData(
    String commercialCode,
    String serviceCode,
    String periodCode,
    JsonNode administrationInfo,
    JsonNode footTraffic,
    JsonNode sales,
    JsonNode facility,
    JsonNode population,
    JsonNode income,
    JsonNode store,
    JsonNode salesSummary,
    JsonNode incomeSummary
) {

}
