package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support.InternalApiResponseReader;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import com.followfollowme.nowdoboss.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class CommercialAnalysisClientAdapter implements CommercialAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;
    private final InternalApiResponseReader responseReader;

    public CommercialAnalysisClientAdapter(
        WebClient.Builder webClientBuilder,
        InternalServiceClientProperties properties,
        InternalApiResponseReader responseReader
    ) {
        this.webClient = webClientBuilder.baseUrl(properties.commercialServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
        this.responseReader = responseReader;
    }

    @Override
    public CommercialFootTrafficQueryResult getCommercialFootTraffic(String commercialCode, String periodCode) {
        return responseReader.getDataBodyAs(webClient, readTimeout, "/api/v1/commercials/{commercialCode}/foot-traffic?periodCode={periodCode}", CommercialFootTrafficQueryResult.class, commercialCode, periodCode);
    }

    @Override
    public CommercialSalesQueryResult getCommercialSales(String commercialCode, String serviceCode, String periodCode) {
        return responseReader.getDataBodyAs(webClient, readTimeout, "/api/v1/commercials/{commercialCode}/services/{serviceCode}/sales?periodCode={periodCode}", CommercialSalesQueryResult.class, commercialCode, serviceCode, periodCode);
    }

    @Override
    public CommercialFacilityQueryResult getCommercialFacility(String commercialCode, String periodCode) {
        return responseReader.getDataBodyAs(webClient, readTimeout, "/api/v1/commercials/{commercialCode}/facilities?periodCode={periodCode}", CommercialFacilityQueryResult.class, commercialCode, periodCode);
    }

    @Override
    public CommercialResidentPopulationQueryResult getCommercialPopulation(String commercialCode, String periodCode) {
        return responseReader.getDataBodyAs(webClient, readTimeout, "/api/v1/commercials/{commercialCode}/population?periodCode={periodCode}", CommercialResidentPopulationQueryResult.class, commercialCode, periodCode);
    }

    @Override
    public CommercialIncomeAndExpenseQueryResult getCommercialIncome(String commercialCode, String periodCode) {
        return responseReader.getDataBodyAs(webClient, readTimeout, "/api/v1/commercials/{commercialCode}/income?periodCode={periodCode}", CommercialIncomeAndExpenseQueryResult.class, commercialCode, periodCode);
    }

    @Override
    public CommercialStoreAnalysisQueryResult getCommercialStore(String commercialCode, String serviceCode, String periodCode) {
        return responseReader.getDataBodyAs(webClient, readTimeout, "/api/v1/commercials/{commercialCode}/services/{serviceCode}/stores?periodCode={periodCode}", CommercialStoreAnalysisQueryResult.class, commercialCode, serviceCode, periodCode);
    }

    @Override
    public CommercialSalesSummaryQueryResult getCommercialSalesSummary(
        String districtCode,
        String administrationCode,
        String commercialCode,
        String serviceCode,
        String periodCode
    ) {
        return responseReader.getDataBodyAs(
            webClient,
            readTimeout,
            "/api/v1/commercials/{commercialCode}/summaries/sales?districtCode={districtCode}&administrationCode={administrationCode}&serviceCode={serviceCode}&periodCode={periodCode}",
            CommercialSalesSummaryQueryResult.class,
            commercialCode,
            districtCode,
            administrationCode,
            serviceCode,
            periodCode
        );
    }

    @Override
    public CommercialIncomeSummaryQueryResult getCommercialIncomeSummary(
        String districtCode,
        String administrationCode,
        String commercialCode,
        String periodCode
    ) {
        return responseReader.getDataBodyAs(
            webClient,
            readTimeout,
            "/api/v1/commercials/{commercialCode}/summaries/income?districtCode={districtCode}&administrationCode={administrationCode}&periodCode={periodCode}",
            CommercialIncomeSummaryQueryResult.class,
            commercialCode,
            districtCode,
            administrationCode,
            periodCode
        );
    }
}