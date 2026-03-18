package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.fasterxml.jackson.databind.JsonNode;

public interface CommercialAnalysisQueryPort {

    JsonNode getCommercialFootTraffic(String commercialCode, String periodCode);

    JsonNode getCommercialSales(String commercialCode, String serviceCode, String periodCode);

    JsonNode getCommercialFacility(String commercialCode, String periodCode);

    JsonNode getCommercialPopulation(String commercialCode, String periodCode);

    JsonNode getCommercialIncome(String commercialCode, String periodCode);

    JsonNode getCommercialStore(String commercialCode, String serviceCode, String periodCode);

    JsonNode getCommercialSalesSummary(
        String districtCode,
        String administrationCode,
        String commercialCode,
        String serviceCode,
        String periodCode
    );

    JsonNode getCommercialIncomeSummary(
        String districtCode,
        String administrationCode,
        String commercialCode,
        String periodCode
    );
}
