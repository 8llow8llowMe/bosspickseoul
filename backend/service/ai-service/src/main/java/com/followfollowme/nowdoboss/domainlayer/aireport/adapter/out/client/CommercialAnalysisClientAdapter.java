package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
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
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
public class CommercialAnalysisClientAdapter implements CommercialAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;
    private final ObjectMapper objectMapper;

    public CommercialAnalysisClientAdapter(WebClient.Builder webClientBuilder, InternalServiceClientProperties properties, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl(properties.commercialServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
        this.objectMapper = objectMapper;
    }

    @Override
    public CommercialFootTrafficQueryResult getCommercialFootTraffic(String commercialCode, String periodCode) {
        JsonNode dataBody = getDataBody("/api/v1/commercials/{commercialCode}/foot-traffic?periodCode={periodCode}", commercialCode, periodCode);
        return objectMapper.convertValue(dataBody, CommercialFootTrafficQueryResult.class);
    }

    @Override
    public CommercialSalesQueryResult getCommercialSales(String commercialCode, String serviceCode, String periodCode) {
        JsonNode dataBody = getDataBody("/api/v1/commercials/{commercialCode}/services/{serviceCode}/sales?periodCode={periodCode}", commercialCode, serviceCode, periodCode);
        return objectMapper.convertValue(dataBody, CommercialSalesQueryResult.class);
    }

    @Override
    public CommercialFacilityQueryResult getCommercialFacility(String commercialCode, String periodCode) {
        JsonNode dataBody = getDataBody("/api/v1/commercials/{commercialCode}/facilities?periodCode={periodCode}", commercialCode, periodCode);
        return objectMapper.convertValue(dataBody, CommercialFacilityQueryResult.class);
    }

    @Override
    public CommercialResidentPopulationQueryResult getCommercialPopulation(String commercialCode, String periodCode) {
        JsonNode dataBody = getDataBody("/api/v1/commercials/{commercialCode}/population?periodCode={periodCode}", commercialCode, periodCode);
        return objectMapper.convertValue(dataBody, CommercialResidentPopulationQueryResult.class);
    }

    @Override
    public CommercialIncomeAndExpenseQueryResult getCommercialIncome(String commercialCode, String periodCode) {
        JsonNode dataBody = getDataBody("/api/v1/commercials/{commercialCode}/income?periodCode={periodCode}", commercialCode, periodCode);
        return objectMapper.convertValue(dataBody, CommercialIncomeAndExpenseQueryResult.class);
    }

    @Override
    public CommercialStoreAnalysisQueryResult getCommercialStore(String commercialCode, String serviceCode, String periodCode) {
        JsonNode dataBody = getDataBody("/api/v1/commercials/{commercialCode}/services/{serviceCode}/stores?periodCode={periodCode}", commercialCode, serviceCode, periodCode);
        return objectMapper.convertValue(dataBody, CommercialStoreAnalysisQueryResult.class);
    }

    @Override
    public CommercialSalesSummaryQueryResult getCommercialSalesSummary(String districtCode, String administrationCode, String commercialCode, String serviceCode, String periodCode) {
        JsonNode dataBody = getDataBody(
            "/api/v1/commercials/{commercialCode}/summaries/sales?districtCode={districtCode}&administrationCode={administrationCode}&serviceCode={serviceCode}&periodCode={periodCode}",
            commercialCode,
            districtCode,
            administrationCode,
            serviceCode,
            periodCode
        );
        return objectMapper.convertValue(dataBody, CommercialSalesSummaryQueryResult.class);
    }

    @Override
    public CommercialIncomeSummaryQueryResult getCommercialIncomeSummary(String districtCode, String administrationCode, String commercialCode, String periodCode) {
        JsonNode dataBody = getDataBody(
            "/api/v1/commercials/{commercialCode}/summaries/income?districtCode={districtCode}&administrationCode={administrationCode}&periodCode={periodCode}",
            commercialCode,
            districtCode,
            administrationCode,
            periodCode
        );
        return objectMapper.convertValue(dataBody, CommercialIncomeSummaryQueryResult.class);
    }

    private JsonNode getDataBody(String uriTemplate, Object... uriVariables) {
        try {
            JsonNode response = webClient.get().uri(uriTemplate, uriVariables).retrieve().bodyToMono(JsonNode.class).block(readTimeout);
            if (response == null || !response.path("dataHeader").path("success").asBoolean(false)) {
                throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
            }

            JsonNode dataBody = response.path("dataBody");
            if (dataBody.isMissingNode() || dataBody.isNull()) {
                throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
            }
            return dataBody;
        } catch (WebClientResponseException exception) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE, exception);
        }
    }
}
