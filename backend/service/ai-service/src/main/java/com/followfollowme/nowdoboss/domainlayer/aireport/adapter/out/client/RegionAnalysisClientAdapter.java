package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import com.followfollowme.nowdoboss.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
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
    public AdministrationDistrictQueryResult getAdministrationDistrict(String administrationCode) {
        return getDataBodyAs("/api/v1/regions/administrations/{administrationCode}", AdministrationDistrictQueryResult.class, administrationCode);
    }

    @Override
    public List<AdministrationCommercialQueryResult> getCommercialsByAdministration(String administrationCode) {
        String districtCode = extractDistrictCode(administrationCode);
        return getDataBodyAs(
            "/api/v1/regions/districts/{districtCode}/administrations/{administrationCode}/commercials",
            objectMapper.getTypeFactory().constructCollectionType(List.class, AdministrationCommercialQueryResult.class),
            districtCode,
            administrationCode
        );
    }

    @Override
    public CommercialAdministrationQueryResult getCommercialAdministration(String commercialCode) {
        return getDataBodyAs("/api/v1/regions/commercials/{commercialCode}/administration", CommercialAdministrationQueryResult.class, commercialCode);
    }

    private <T> T getDataBodyAs(String uriTemplate, Class<T> responseType, Object... uriVariables) {
        return objectMapper.convertValue(getDataBody(uriTemplate, uriVariables), responseType);
    }

    private <T> T getDataBodyAs(String uriTemplate, com.fasterxml.jackson.databind.JavaType responseType, Object... uriVariables) {
        return objectMapper.convertValue(getDataBody(uriTemplate, uriVariables), responseType);
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

    private String extractDistrictCode(String administrationCode) {
        if (Objects.isNull(administrationCode) || administrationCode.length() < 5) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
        }
        return administrationCode.substring(0, 5);
    }
}
