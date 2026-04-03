package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;

public record CommercialAiSourceData(
    String commercialCode,
    String serviceCode,
    String periodCode,
    CommercialAdministrationQueryResult administrationInfo,
    CommercialFootTrafficQueryResult footTraffic,
    CommercialSalesQueryResult sales,
    CommercialFacilityQueryResult facility,
    CommercialResidentPopulationQueryResult population,
    CommercialIncomeAndExpenseQueryResult income,
    CommercialStoreAnalysisQueryResult store,
    CommercialSalesSummaryQueryResult salesSummary,
    CommercialIncomeSummaryQueryResult incomeSummary
) {

}
