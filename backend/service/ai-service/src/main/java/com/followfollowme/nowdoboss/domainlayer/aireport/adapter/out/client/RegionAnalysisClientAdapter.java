package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.nowdoboss.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
public class RegionAnalysisClientAdapter implements RegionAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;
    private final ObjectMapper objectMapper;

    public RegionAnalysisClientAdapter(WebClient.Builder webClientBuilder, InternalServiceClientProperties properties, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl(properties.districtServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
        this.objectMapper = objectMapper;
    }

    @Override
    public CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode) {
        JsonNode dataBody = getDataBody("/api/v1/regions/commercials/{commercialCode}/administration", commercialCode);
        return objectMapper.convertValue(dataBody, CommercialAdministrationQueryResult.class);
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
