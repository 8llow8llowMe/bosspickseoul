package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
public class CommercialAnalysisClientAdapter implements CommercialAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;

    public CommercialAnalysisClientAdapter(WebClient.Builder webClientBuilder, InternalServiceClientProperties properties) {
        this.webClient = webClientBuilder
            .baseUrl(properties.commercialServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
    }

    @Override
    public JsonNode getCommercialFootTraffic(String commercialCode, String periodCode) {
        return getDataBody("/api/v1/commercials/{commercialCode}/foot-traffic?periodCode={periodCode}", commercialCode, periodCode);
    }

    @Override
    public JsonNode getCommercialSales(String commercialCode, String serviceCode, String periodCode) {
        return getDataBody(
            "/api/v1/commercials/{commercialCode}/services/{serviceCode}/sales?periodCode={periodCode}",
            commercialCode,
            serviceCode,
            periodCode
        );
    }

    @Override
    public JsonNode getCommercialFacility(String commercialCode, String periodCode) {
        return getDataBody("/api/v1/commercials/{commercialCode}/facilities?periodCode={periodCode}", commercialCode, periodCode);
    }

    @Override
    public JsonNode getCommercialPopulation(String commercialCode, String periodCode) {
        return getDataBody("/api/v1/commercials/{commercialCode}/population?periodCode={periodCode}", commercialCode, periodCode);
    }

    @Override
    public JsonNode getCommercialIncome(String commercialCode, String periodCode) {
        return getDataBody("/api/v1/commercials/{commercialCode}/income?periodCode={periodCode}", commercialCode, periodCode);
    }

    @Override
    public JsonNode getCommercialStore(String commercialCode, String serviceCode, String periodCode) {
        return getDataBody(
            "/api/v1/commercials/{commercialCode}/services/{serviceCode}/stores?periodCode={periodCode}",
            commercialCode,
            serviceCode,
            periodCode
        );
    }

    @Override
    public JsonNode getCommercialSalesSummary(
        String districtCode,
        String administrationCode,
        String commercialCode,
        String serviceCode,
        String periodCode
    ) {
        return getDataBody(
            "/api/v1/commercials/{commercialCode}/summaries/sales?districtCode={districtCode}&administrationCode={administrationCode}&serviceCode={serviceCode}&periodCode={periodCode}",
            commercialCode,
            districtCode,
            administrationCode,
            serviceCode,
            periodCode
        );
    }

    @Override
    public JsonNode getCommercialIncomeSummary(
        String districtCode,
        String administrationCode,
        String commercialCode,
        String periodCode
    ) {
        return getDataBody(
            "/api/v1/commercials/{commercialCode}/summaries/income?districtCode={districtCode}&administrationCode={administrationCode}&periodCode={periodCode}",
            commercialCode,
            districtCode,
            administrationCode,
            periodCode
        );
    }

    private JsonNode getDataBody(String uriTemplate, Object... uriVariables) {
        try {
            JsonNode response = webClient.get()
                .uri(uriTemplate, uriVariables)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block(readTimeout);

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
