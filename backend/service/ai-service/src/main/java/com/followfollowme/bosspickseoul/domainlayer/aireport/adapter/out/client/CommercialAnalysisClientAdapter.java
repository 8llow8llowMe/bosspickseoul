package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.CommercialAnalysisClient;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.support.InternalResponseSupport;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialComparisonQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommercialAnalysisClientAdapter implements CommercialAnalysisQueryPort {

    private final CommercialAnalysisClient commercialAnalysisClient;
    private final InternalResponseSupport responseSupport;

    @Override
    public CommercialFootTrafficQueryResult getCommercialFootTraffic(String commercialCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> commercialAnalysisClient.getCommercialFootTraffic(commercialCode, periodCode));
    }

    @Override
    public CommercialSalesQueryResult getCommercialSales(String commercialCode, String serviceCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> commercialAnalysisClient.getCommercialSales(commercialCode, serviceCode, periodCode));
    }

    @Override
    public CommercialFacilityQueryResult getCommercialFacility(String commercialCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> commercialAnalysisClient.getCommercialFacility(commercialCode, periodCode));
    }

    @Override
    public CommercialResidentPopulationQueryResult getCommercialPopulation(String commercialCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> commercialAnalysisClient.getCommercialPopulation(commercialCode, periodCode));
    }

    @Override
    public CommercialIncomeAndExpenseQueryResult getCommercialIncome(String commercialCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> commercialAnalysisClient.getCommercialIncome(commercialCode, periodCode));
    }

    @Override
    public CommercialStoreAnalysisQueryResult getCommercialStore(String commercialCode, String serviceCode, String periodCode) {
        return responseSupport.requestAndUnwrap(InternalResponseSupport.COMMERCIAL_SERVICE, () -> commercialAnalysisClient.getCommercialStore(commercialCode, serviceCode, periodCode));
    }

    @Override
    public CommercialSalesSummaryQueryResult getCommercialSalesSummary(
        String districtCode, String administrationCode, String commercialCode, String serviceCode, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialSalesSummary(
                commercialCode, districtCode, administrationCode, serviceCode, periodCode
            )
        );
    }

    @Override
    public CommercialIncomeSummaryQueryResult getCommercialIncomeSummary(
        String districtCode, String administrationCode, String commercialCode, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialIncomeSummary(commercialCode, districtCode, administrationCode, periodCode)
        );
    }

    @Override
    public CommercialComparisonQueryResult getCommercialComparison(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        return responseSupport.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE,
            () -> commercialAnalysisClient.getCommercialComparison(leftCommercialCode, rightCommercialCode, serviceCode, periodCode)
        );
    }
}
