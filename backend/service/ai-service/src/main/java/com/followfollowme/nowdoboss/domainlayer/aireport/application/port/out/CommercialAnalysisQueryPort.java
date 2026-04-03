package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;

public interface CommercialAnalysisQueryPort {

    CommercialFootTrafficQueryResult getCommercialFootTraffic(String commercialCode, String periodCode);

    CommercialSalesQueryResult getCommercialSales(String commercialCode, String serviceCode, String periodCode);

    CommercialFacilityQueryResult getCommercialFacility(String commercialCode, String periodCode);

    CommercialResidentPopulationQueryResult getCommercialPopulation(String commercialCode, String periodCode);

    CommercialIncomeAndExpenseQueryResult getCommercialIncome(String commercialCode, String periodCode);

    CommercialStoreAnalysisQueryResult getCommercialStore(String commercialCode, String serviceCode, String periodCode);

    CommercialSalesSummaryQueryResult getCommercialSalesSummary(String districtCode, String administrationCode, String commercialCode, String serviceCode, String periodCode);

    CommercialIncomeSummaryQueryResult getCommercialIncomeSummary(String districtCode, String administrationCode, String commercialCode, String periodCode);
}
