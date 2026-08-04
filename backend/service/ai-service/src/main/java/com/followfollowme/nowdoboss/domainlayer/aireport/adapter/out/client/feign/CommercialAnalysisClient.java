package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.feign;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialComparisonQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
    name = "${feign-client.target-services.commercial-service:commercial-service}",
    contextId = "commercialAnalysisClient",
    path = "/api/v1/commercials"
)
public interface CommercialAnalysisClient {

    @GetMapping("/{commercialCode}/foot-traffic")
    Response<CommercialFootTrafficQueryResult> getCommercialFootTraffic(
        @PathVariable String commercialCode, @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/services/{serviceCode}/sales")
    Response<CommercialSalesQueryResult> getCommercialSales(
        @PathVariable String commercialCode,
        @PathVariable String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/facilities")
    Response<CommercialFacilityQueryResult> getCommercialFacility(@PathVariable String commercialCode, @RequestParam String periodCode);

    @GetMapping("/{commercialCode}/population")
    Response<CommercialResidentPopulationQueryResult> getCommercialPopulation(
        @PathVariable String commercialCode, @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/income")
    Response<CommercialIncomeAndExpenseQueryResult> getCommercialIncome(
        @PathVariable String commercialCode, @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/services/{serviceCode}/stores")
    Response<CommercialStoreAnalysisQueryResult> getCommercialStore(
        @PathVariable String commercialCode,
        @PathVariable String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/summaries/sales")
    Response<CommercialSalesSummaryQueryResult> getCommercialSalesSummary(
        @PathVariable String commercialCode,
        @RequestParam String districtCode,
        @RequestParam String administrationCode,
        @RequestParam String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/summaries/income")
    Response<CommercialIncomeSummaryQueryResult> getCommercialIncomeSummary(
        @PathVariable String commercialCode,
        @RequestParam String districtCode,
        @RequestParam String administrationCode,
        @RequestParam String periodCode
    );

    @GetMapping("/compare")
    Response<CommercialComparisonQueryResult> getCommercialComparison(
        @RequestParam String leftCommercialCode,
        @RequestParam String rightCommercialCode,
        @RequestParam String serviceCode,
        @RequestParam String periodCode
    );
}
