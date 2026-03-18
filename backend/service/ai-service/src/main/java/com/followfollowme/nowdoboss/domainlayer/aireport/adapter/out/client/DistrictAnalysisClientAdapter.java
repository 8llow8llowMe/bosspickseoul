package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
public class DistrictAnalysisClientAdapter implements DistrictAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;

    public DistrictAnalysisClientAdapter(WebClient.Builder webClientBuilder, InternalServiceClientProperties properties) {
        this.webClient = webClientBuilder
            .baseUrl(properties.districtServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
    }

    @Override
    public JsonNode getDistrictDetail(String districtCode, String periodCode) {
        return getDataBody("/api/v1/districts/{districtCode}?currentPeriodCode={periodCode}", districtCode, periodCode);
    }

    @Override
    public JsonNode getCommercialAdministration(String commercialCode) {
        return getDataBody("/api/v1/regions/commercials/{commercialCode}/administration", commercialCode);
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
