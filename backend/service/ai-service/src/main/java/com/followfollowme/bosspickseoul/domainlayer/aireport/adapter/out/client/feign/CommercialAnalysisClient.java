package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFacilityClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFootTrafficClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeAndExpenseClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeSummaryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialResidentPopulationClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesSummaryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialStoreAnalysisClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialComparisonQueryResult;
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
    Response<CommercialFootTrafficClientResponse> getCommercialFootTraffic(
        @PathVariable String commercialCode, @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/services/{serviceCode}/sales")
    Response<CommercialSalesClientResponse> getCommercialSales(
        @PathVariable String commercialCode,
        @PathVariable String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/facilities")
    Response<CommercialFacilityClientResponse> getCommercialFacility(@PathVariable String commercialCode, @RequestParam String periodCode);

    @GetMapping("/{commercialCode}/population")
    Response<CommercialResidentPopulationClientResponse> getCommercialPopulation(
        @PathVariable String commercialCode, @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/income")
    Response<CommercialIncomeAndExpenseClientResponse> getCommercialIncome(
        @PathVariable String commercialCode, @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/services/{serviceCode}/stores")
    Response<CommercialStoreAnalysisClientResponse> getCommercialStore(
        @PathVariable String commercialCode,
        @PathVariable String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/summaries/sales")
    Response<CommercialSalesSummaryClientResponse> getCommercialSalesSummary(
        @PathVariable String commercialCode,
        @RequestParam String districtCode,
        @RequestParam String administrationCode,
        @RequestParam String serviceCode,
        @RequestParam String periodCode
    );

    @GetMapping("/{commercialCode}/summaries/income")
    Response<CommercialIncomeSummaryClientResponse> getCommercialIncomeSummary(
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
